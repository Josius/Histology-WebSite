/**::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
@license Zoomify Image Viewer support file, Copyright Zoomify, Inc., 1999-2018. All rights reserved. You may
use this file on private and public websites, for personal and commercial purposes, with or without modifications, so long as this
notice is included. Redistribution via other means is not permitted without prior permission. Additional terms apply. For complete
license terms please see the Zoomify License Agreement in this product and on the Zoomify website at www.zoomify.com.
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
*/

(function () { var global = (function () { return this; } ).call(); global.ZD = {}; })();
var dispZIFHeader, dispZIFTierData;
ZD.imageW = 0;
ZD.imageH = 0;


//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::::::::::::::::::::::::::::::::::::::: LOAD HEADER ::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

ZD.loadHeader = function () { 
	displayZIFPath = document.getElementById('displayZIFPath');
	ZD.imagePath = displayZIFPath.value;
	ZD.Utils.detectBrowserFeatures();
	var netConnector = new ZD.NetConnector();
	netConnector.loadByteRange(ZD.imagePath, 0, 8192, 'header');
}

function parseZIFHeader (data) {
	if (data[0] == 0x49 && data[1] == 0x49 && data[2] == 0x2b && data[3] == 0x00 && data[4] == 0x08 &&  data[5] == 0x00 && data[6] == 0x00 && data[7] == 0x00 && data[8] == 0x10 && data[9] == 0x00 && data[10] == 0x00 && data[11] == 0x00 && data[12] == 0x00 && data[13] == 0x00 && data[14] == 0x00 && data[15] == 0x00) {	
		
		var ifdOffset = ZD.Utils.longValue(data, 8); // First IFD.
		var tagCounter = ZD.Utils.longValue(data, ifdOffset); // First tag.
		var ifdCounter = 1;
		var tW = 0, tH = 0;

		// Parse ZIF header to extract tier and tile values.
		while (ifdOffset != 0) {
			for (var x = 0; x < tagCounter; x++) {
				var itemOffset = ifdOffset + 8 + x * 20;
				var tag = ZD.Utils.shortValue(data, itemOffset);

				switch (tag) {
					case 256: // Image width.
						var tempW = ZD.Utils.intValue(data, itemOffset + 12);
						if (tempW > ZD.imageW) { ZD.imageW = tempW; }
						break;
					case 257: // Image height.
						var tempH = ZD.Utils.intValue(data, itemOffset + 12);
						if (tempH > ZD.imageH) { ZD.imageH = tempH; }
						break;
				}
			}
			ifdOffset = ZD.Utils.longValue(data, ifdOffset + tagCounter * 20 + 8);
			tagCounter = ZD.Utils.longValue(data, ifdOffset);
			ifdCounter++;
		}
		tierCount = ifdCounter - 1;
		
		dispZIFHeader = document.getElementById('displayZIFDimensions');		
		dispZIFHeader.value = ZD.imageW.toString() + ' : ' + ZD.imageH.toString();
	}
}


//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::: NETWORK FUNCTIONS :::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

ZD.NetConnector = function () {

	this.loadByteRange = function (filePath, rangeStart, rangeEnd, contentType, tile, chunkID) {
		var rangeData = new ZD.Utils.Range(rangeStart, rangeEnd);
		makeNetRequest(filePath, receiveResponse, rangeData, contentType, tile, chunkID);
	}

	function makeNetRequest (url, callback, data, contentType, tile, chunkN) {
		var netRequest = createXMLHttpRequest();
		if (!netRequest) {
			console.log('Browser does not support XMLHttpRequest.');
		} else {
			var isAsync = (typeof callback === 'function');
			if (isAsync) {
				var actual = callback;
				var callback = function () { window.setTimeout(ZD.Utils.createCallback(null, actual, netRequest), 1); };
				netRequest.onreadystatechange = function () {
					if (netRequest.readyState == 4) {
						netRequest.onreadystatechange = new Function ();
						callback();
					}
				};
			}
			
			try {
				if (typeof data === 'undefined' || data === null) {
					netRequest.open('GET', url, isAsync);
					netRequest.send(null);
				} else if (typeof contentType !== 'undefined' && contentType !== null) {
					netRequest.open('GET', url, true);
					netRequest.responseType = 'arraybuffer';
					ZD.Utils.defineObjectProperty(netRequest, 'zType', { value : contentType, writable : false, enumerable : false, configurable : false });
					if (ZD.browser == ZD.browsers.SAFARI) { netRequest.setRequestHeader('If-Modified-Since', 'Thu, 01 Dec 1994 16:00:00 GMT'); }
					netRequest.setRequestHeader('Range', 'bytes=' + data.start.toString() + '-' + data.end.toString());
					netRequest.send(null);
				}				
			} catch (e) {		
				netRequestErrorHandler(e, url, contentType);
				netRequest.onreadystatechange = netRequest = null;
			}
		}
	}

	function createXMLHttpRequest () {
		var netReq = null;
		switch (ZD.xmlHttpRequestSupport) {
			case 'XMLHttpRequest' :
				netReq = new XMLHttpRequest();
				break;
			case 'Msxml2.XMLHTTP.6.0' :
				netReq = new ActiveXObject('Msxml2.XMLHTTP.6.0');
				break;
			case 'Msxml2.XMLHTTP.3.0' :
				netReq = new ActiveXObject('Msxml2.XMLHTTP.3.0');
				break;
			case 'Microsoft.XMLHTTP' :
				netReq = new ActiveXObject('Microsoft.XMLHTTP');
				break;
		}		
		return netReq;
	}
	
	function netRequestErrorHandler (e, url, contentType) {
		if (url.toUpperCase().indexOf('.ZIF') != -1) {
			console.log('Error loading image: ZIF file data request failed. Request content type: ' + contentType + '.');
		}else if (url.toUpperCase().indexOf('reply_data') != -1) {
			console.log('Error making network request - image offset.');
		} else {
			console.log('Error making network request: possible invalid path or network error.');
		}
	}

	function receiveResponse (xhr) {
		if (!xhr) {
			console.log('Error related to network security.');
		} else if (xhr.status !== 200 && xhr.status !== 0 && xhr.status !== 206) {
			var status = xhr.status;
			var statusText = (status == 404) ? 'Not Found' : xhr.statusText;
			console.log('Error related to network status - range requests and ZIF storage may not be supported: ' + status + ' - ' + statusText);
		} else {
			var doc = null;
			if (xhr.response && xhr.zType) {
				var data = new ZD.Utils.createUint8Array(xhr.response, 0);			
				if (xhr.zType == 'header') { parseZIFHeader(data); }
			}
		}
	}

	function onComplete (callback, src, img) {
		if (typeof callback === 'function') {
			try {
				callback(img);
			} catch (e) {
				console.log(e.name + ' while executing callback: ' + src + ' ' + e.message);
			}
		}
	}
};



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::::::::::::::::::::::::::::::::::: UTILITY FUNCTIONS :::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

ZD.Utils = {
	
	detectBrowserFeatures : function () {
		ZD.browsers = { UNKNOWN: 0, IE: 1, FIREFOX: 2, SAFARI: 3, CHROME: 4, OPERA: 5 };
		var browser = ZD.browsers.UNKNOWN;
		var browserVersion = 0;
		var app = navigator.appName;
		var ver = navigator.appVersion;
		var msInterpolationMode = false;
		var gwkRenderingMode = false;
		var ua = navigator.userAgent.toLowerCase();
		if (app == 'Microsoft Internet Explorer' && !! window.attachEvent && !! window.ActiveXObject) {
			var ieOffset = ua.indexOf('msie');
			browser = ZD.browsers.IE;			
			browserVersion = parseFloat(ua.substring(ieOffset + 5, ua.indexOf(';', ieOffset)));
			msInterpolationMode = (typeof document.documentMode !== 'undefined');
		} else if (app == 'Netscape' && ua.indexOf('trident') != -1) {
			browser = ZD.browsers.IE;			
			browserVersion = 11;			
		} else if (app == 'Netscape' && !! window.addEventListener) {
			var idxFF = ua.indexOf('firefox');
			var idxSA = ua.indexOf('safari');
			var idxCH = ua.indexOf('chrome');
			if (idxFF >= 0) {
				browser = ZD.browsers.FIREFOX;
				browserVersion = parseFloat(ua.substring(idxFF + 8));
			} else if (idxSA >= 0) {
				var slash = ua.substring(0, idxSA).lastIndexOf('/');
				browser = (idxCH >= 0) ? ZD.browsers.CHROME : ZD.browsers.SAFARI;
				browserVersion = parseFloat(ua.substring(slash + 1, idxSA));
			}
			var testImage = new Image();
			if (testImage.style.getPropertyValue) { gwkRenderingMode = testImage.style.getPropertyValue ('image-rendering'); }
		} else if (app == 'Opera' && !! window.opera && Object.prototype.toString.call(window.opera) == '[object Opera]') {
			browser = ZD.browsers.OPERA;
			browserVersion = parseFloat(ver);
		}
		var xmlHttpRequestSupport;
		if (window.ActiveXObject) {
			var arrActiveX = ['Msxml2.XMLHTTP.6.0', 'Msxml2.XMLHTTP.3.0', 'Microsoft.XMLHTTP'];
			for (var i = 0, j = arrActiveX.length; i < j; i++) {
				try {
					netReq = new ActiveXObject(arrActiveX[i]);
					xmlHttpRequestSupport = arrActiveX[i];
					break;
				} catch (e) {
					continue;
				}
			}
		} else if (window.XMLHttpRequest) {
			netReq = new XMLHttpRequest();
			xmlHttpRequestSupport =  'XMLHttpRequest';
		}		
		var responseArraySupported = ('response' in XMLHttpRequest.prototype || 'mozResponseArrayBuffer' in XMLHttpRequest.prototype || 'mozResponse' in XMLHttpRequest.prototype || 'responseArrayBuffer' in XMLHttpRequest.prototype);
		var docElmt = document.documentElement || {};
		var docElmtStyle = docElmt.style || {};
		var cssTransformsSupported = false;
		var cssTransformProperties = ['transform', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform'];
		var cssTransformProperty;
		var cssTransformNoUnits;
		while (cssTransformProperty = cssTransformProperties.shift()) {
			if (typeof docElmtStyle[cssTransformProperty] !== 'undefined') {
				cssTransformsSupported = true;
				cssTransformNoUnits = /webkit/i.test(cssTransformProperty);
				break;
			}
		}
		var float32ArraySupported = false;
		try {
			var a = new Float32Array(1);
			float32ArraySupported = true;
		} catch (e) { }
		var uInt8ArraySupported = false;
		try {
			var a = new Uint8Array(1);
			uInt8ArraySupported = true;
		} catch (e) { }
		var definePropertySupported = false;
		if (typeof Object.defineProperty == 'function') {
			try {
				Object.defineProperty({}, 'x', {});
				definePropertySupported = true;
			} catch (e) { }
		}	
		ZD.xmlHttpRequestSupport = xmlHttpRequestSupport;
		ZD.responseArraySupported = responseArraySupported;
		ZD.cssTransformsSupported = cssTransformsSupported;
		ZD.cssTransformProperty = cssTransformProperty;
		ZD.cssTransformNoUnits = cssTransformNoUnits;	
		ZD.float32ArraySupported = float32ArraySupported;
		ZD.uInt8ArraySupported = uInt8ArraySupported;
		ZD.definePropertySupported = definePropertySupported;
		if (!ZD.responseArraySupported) {
			ZD.Utils.defineObjectProperty(XMLHttpRequest.prototype, 'response', {
				get: function() { return new VBArray(this.responseBody).toArray(); }
			});
		}
	},
		
	createCallback : function (object, method) {
		var initialArgs = [];
		for (var i = 2, j = arguments.length; i < j; i++) {
			initialArgs[initialArgs.length] = arguments[i];
		}
		return function () {
			var args = initialArgs.concat([]);
			for (var i = 0, j = arguments.length; i < j; i++) {
				args[args.length] = arguments[i];
			}
			return method.apply(object, args);
		};
	},

	Range : function (start, end) {
		this.start = typeof start === 'number' ? start : 0;
		this.end = typeof end === 'number' ? end : 0;
	},

	arraySubarraySimple : function (start, end) {
		return this.slice(start, end);
	},

	arraySubarray : function (arr, iIndexA, iIndexB ) {
		if (iIndexA < 0) iIndexA = 0;
		if (!iIndexB || iIndexB > arr.length) iIndexB = arr.length;
		if (iIndexA == iIndexB) return [];
		var aReturn = [];
		for (var i = iIndexA; i < iIndexB; i++) {
			aReturn[aReturn.length] = arr[i];
		}
		return aReturn;
	},
	
	intValue : function (array, offset) {
		return (array[offset] + (array[offset + 1] << 8) | (array[offset + 2] << 16)) + (array[offset + 3] * 16777216);
	},

	longValue : function (array, offset) {
		var value = (array[offset] + (array[offset + 1] << 8) | (array[offset + 2] << 16)) + (array[offset + 3] * 16777216);
		if (array[offset + 4] != 0) { value = value + array[offset + 4] * 4294967296; }
		return value;
	},
	
	shortValue : function (array, offset) {
		return array[offset] + (array[offset + 1] << 8);
	},

	createUint8Array : function (array, offset) {
		if (ZD.uInt8ArraySupported) {
			return new Uint8Array(array, offset);
		} else {
			return new ZD.Utils.TypedArray(array, offset);
		}
	},

	TypedArray : function (arg1) {
		var result;
		if (typeof arg1 === 'number') {
			result = new Array(arg1);
			for (var i = 0; i < arg1; ++i) {
				result[i] = 0;
			}
		} else {
			result = arg1.slice(0);
		}
		result.subarray = ZD.Utils.arraySubarraySimple;
		result.buffer = result;
		result.byteLength = result.length;
		result.set = ZD.Utils.setSimple;
		if (typeof arg1 === 'object' && arg1.buffer) {
			result.buffer = arg1.buffer;
		}
		return result;
	},

	setSimple : function (array, offset) {
		if (arguments.length < 2) { offset = 0; }
		for (var i = 0, n = array.length; i < n; ++i, ++offset) {
			this[offset] = array[i] & 0xFF;
		}
	},
	
	defineObjectProperty : function (obj, name, def) {
		if (ZD.definePropertySupported) {
			Object.defineProperty(obj, name, def);			
		} else {
			delete obj[name];
			if ('get' in def) { obj.__defineGetter__(name, def['get']); }
			if ('set' in def) { obj.__defineSetter__(name, def['set']); }
			if ('value' in def) {
				obj.__defineSetter__(name, function objectDefinePropertySetter(value) {
					this.__defineGetter__(name, function objectDefinePropertyGetter() {
						return value;
					});
					return value;
				});
				obj[name] = def.value;
			}
		}
	}	
};