/**::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
@license Zoomify Image Viewer support file, Copyright Zoomify, Inc., 1999-2018. All rights reserved. You may
use this file on private and public websites, for personal and commercial purposes, with or without modifications, so long as this
notice is included. Redistribution via other means is not permitted without prior permission. Additional terms apply. For complete
license terms please see the Zoomify License Agreement in this product and on the Zoomify website at www.zoomify.com.
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
*/

(function () { var global = (function () { return this; } ).call(); global.ZT = {}; })();
var tierTileOffsetsStart, tierTileByteCountsStart;

ZT.showZIFThumbnail = function (thumbID, imagePath) {
	ZT.Utils.detectBrowserFeatures();
	var netConnector = new ZT.NetConnector();
	netConnector.loadByteRange(imagePath, 0, 8192, 'header', null, null, thumbID);
}

function parseZIFHeader (data, url, thumbID) {
	if (data[0] == 0x49 && data[1] == 0x49 && data[2] == 0x2b && data[3] == 0x00 && data[4] == 0x08 &&  data[5] == 0x00 && data[6] == 0x00 && data[7] == 0x00 && data[8] == 0x10 && data[9] == 0x00 && data[10] == 0x00 && data[11] == 0x00 && data[12] == 0x00 && data[13] == 0x00 && data[14] == 0x00 && data[15] == 0x00) {	
		var ifdOffset = ZT.Utils.longValue(data, 8);
		var tagCounter = ZT.Utils.longValue(data, ifdOffset);
		var tW = 0, tH = 0;
		while (ifdOffset != 0) {
			for (var x = 0; x < tagCounter; x++) {
				var itemOffset = ifdOffset + 8 + x * 20;
				var tag = ZT.Utils.shortValue(data, itemOffset);
				switch (tag) {
					case 324:
						tierTileOffsetsStart = ZT.Utils.longValue(data, itemOffset + 12);
						break;
					case 325:
						tierTileByteCountsStart = ZT.Utils.intValue(data, itemOffset + 12);
						break;
				}
			}
			ifdOffset = ZT.Utils.longValue(data, ifdOffset + tagCounter * 20 + 8);
			tagCounter = ZT.Utils.longValue(data, ifdOffset);
		}	
		var tile = {};
		tile.name = '0-0-0';
		tile.image = null;
		tile.elmt = null;
		tile.style = null;
		tile.url = url + '?' + tierTileOffsetsStart + ','+ tierTileByteCountsStart;
		tile.thumbID = thumbID;
		var tileNetConnector = new ZT.NetConnector();
		tileNetConnector.loadImage(tile.url, 'image-display', tile);
	}
}

function parseZIFTileImage (data, tile, target) {
	var src = 'data:image/jpeg;base64,' + ZT.Utils.encodeBase64(data);
	var func = ZT.Utils.createCallback(null, onTileLoad, tile);
	ZT.Utils.createImageElementFromBytes(src, func);
}

function onTileLoad (tile, image) {
	if (image && image.width != 0 && image.height != 0) {
		var thumbImg = document.getElementById(tile.thumbID);
		image.id = tile.thumbID;
		image.alt = thumbImg.alt ;
		image.title = thumbImg.title;
		thumbImg.parentNode.appendChild(image);
		thumbImg.parentNode.removeChild(thumbImg);
	}
}

ZT.NetConnector = function () {

	this.loadByteRange = function (filePath, rangeStart, rangeEnd, contentType, tile, chunkID, thumbID) {
		var rangeData = new ZT.Utils.Range(rangeStart, rangeEnd);
		makeNetRequest(filePath, receiveResponse, rangeData, contentType, tile, chunkID, thumbID);
	}

	function makeNetRequest (url, callback, data, contentType, tile, chunkN, thumbID) {
		var netRequest = createXMLHttpRequest();
		if (!netRequest) {
			console.log('Browser does not support XMLHttpRequest.');
		} else {
			var isAsync = (typeof callback === 'function');
			if (isAsync) {
				var actual = callback;
				var callback = function () { window.setTimeout(ZT.Utils.createCallback(null, actual, netRequest), 1); };
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
					ZT.Utils.defineObjectProperty(netRequest, 'zType', { value : contentType, writable : false, enumerable : false, configurable : false });
					ZT.Utils.defineObjectProperty(netRequest, 'zTile', { value : tile, writable : false, enumerable : false, configurable : false });
					ZT.Utils.defineObjectProperty(netRequest, 'zPath', { value : url, writable : false, enumerable : false, configurable : false });
					ZT.Utils.defineObjectProperty(netRequest, 'zThumbID', { value : thumbID, writable : false, enumerable : false, configurable : false });
					if (ZT.browser == ZT.browsers.SAFARI) { netRequest.setRequestHeader('If-Modified-Since', 'Thu, 01 Dec 1994 16:00:00 GMT'); }
					netRequest.setRequestHeader('Range', 'bytes=' + data.start.toString() + '-' + data.end.toString());
					netRequest.send(null);
				}				
			} catch (e) {		
				console.log('Error loading ZIF thumbnail');
				netRequest.onreadystatechange = netRequest = null;
			}
		}
	}

	function createXMLHttpRequest () {
		var netReq = null;
		switch (ZT.xmlHttpRequestSupport) {
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

	function receiveResponse (xhr) {
		if (!xhr) {
			console.log('Error related to network security.');
		} else if (xhr.status !== 200 && xhr.status !== 0 && xhr.status !== 206) {
			var status = xhr.status;
			var statusText = (status == 404) ? 'Not Found' : xhr.statusText;
			console.log('Error related to network status.');
		} else {
			var doc = null;
			if (xhr.response && xhr.zType) {
				var data = new ZT.Utils.createUint8Array(xhr.response, 0);			
				if (xhr.zType == 'header') {
					parseZIFHeader(data, xhr.zPath, xhr.zThumbID);
				} else if (xhr.zType.substring(0,5) == 'image') {
					parseZIFTileImage(data, xhr.zTile, xhr.zType);
				} else {
					console.log('Error making network request.');
				}
			}
		}
	}

	this.loadImage = function (filePath, contentType, tile) {
		if ((typeof tile !== 'undefined' && tile !== null) || contentType == 'navigator') {
			var imagePath = filePath.substring(0, filePath.indexOf('?'));
			var rangeStart = parseFloat(filePath.substring(filePath.indexOf('?') + 1, filePath.indexOf(',')));
			var rangeLength = parseFloat(filePath.substring(filePath.indexOf(',') + 1, filePath.length));
			var rangeEnd = rangeStart + rangeLength;
			var rangeData = new ZT.Utils.Range(rangeStart, rangeEnd);
			makeNetRequest(imagePath, receiveResponse, rangeData, contentType, tile, null, tile.thumbID);
		}
		return true;
	}
};

ZT.Utils = {
	
	detectBrowserFeatures : function () {
		if (typeof ZT.browsers === 'undefined' || typeof ZT.xmlHttpRequestSupport === 'undefined' || typeof ZT.responseArraySupported === 'undefined' || typeof ZT.float32ArraySupported === 'undefined' || typeof ZT.uInt8ArraySupported === 'undefined' || typeof ZT.definePropertySupported === 'undefined') {
			ZT.browsers = { UNKNOWN: 0, IE: 1, FIREFOX: 2, SAFARI: 3, CHROME: 4, OPERA: 5 };
			var browser = ZT.browsers.UNKNOWN;
			var app = navigator.appName;
			var ua = navigator.userAgent.toLowerCase();
			if (app == 'Microsoft Internet Explorer' && !! window.attachEvent && !! window.ActiveXObject) {
				browser = ZT.browsers.IE;			
			} else if (app == 'Netscape' && ua.indexOf('trident') != -1) {
				browser = ZT.browsers.IE;		
			} else if (app == 'Netscape' && !! window.addEventListener) {
				var idxFF = ua.indexOf('firefox');
				var idxSA = ua.indexOf('safari');
				var idxCH = ua.indexOf('chrome');
				if (idxFF >= 0) {
					browser = ZT.browsers.FIREFOX;
				} else if (idxSA >= 0) {
					browser = (idxCH >= 0) ? ZT.browsers.CHROME : ZT.browsers.SAFARI;
				}
			} else if (app == 'Opera' && !! window.opera && Object.prototype.toString.call(window.opera) == '[object Opera]') {
				browser = ZT.browsers.OPERA;
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
			ZT.browser = browser;
			ZT.xmlHttpRequestSupport = xmlHttpRequestSupport;
			ZT.responseArraySupported = responseArraySupported;
			ZT.float32ArraySupported = float32ArraySupported;
			ZT.uInt8ArraySupported = uInt8ArraySupported;
			ZT.definePropertySupported = definePropertySupported;
			if (!ZT.responseArraySupported) {
				ZT.Utils.defineObjectProperty(XMLHttpRequest.prototype, 'response', {
					get: function() { return new VBArray(this.responseBody).toArray(); }
				});
			}
		}
	},

	isStrVal : function (value) {
		return (typeof value !== 'undefined' && value !== null && value !== '' && value !== 'null');
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
	
	createContainerElement : function (tagName, id, display, position, overflow, width, height, left, top, borderStyle, borderWidth, background, margin, padding, whiteSpace, cursor, preventSelect) {
		var emptyContainer = document.createElement(tagName);
		if (this.isStrVal(id)) { emptyContainer.id = id; }
		var ecS = emptyContainer.style;
		ecS.display = (this.isStrVal(display)) ? display : 'inline-block';
 		ecS.position = (this.isStrVal(position)) ? position : 'static';
 		ecS.overflow = (this.isStrVal(overflow)) ? overflow : 'hidden';
 		if (tagName == 'canvas') {
 			if (this.isStrVal(width)) { emptyContainer.setAttribute('width', width); }
 			if (this.isStrVal(height)) { emptyContainer.setAttribute('height', height); }
 		} else {
 			if (this.isStrVal(width)) { ecS.width = width; }
 			if (this.isStrVal(height)) { ecS.height = height; }
 		}
 		if (this.isStrVal(left)) { ecS.left = left; }
 		if (this.isStrVal(top)) { ecS.top = top; }
 		ecS.borderStyle = (this.isStrVal(borderStyle)) ? borderStyle : 'none';
 		ecS.borderWidth = (this.isStrVal(borderWidth)) ? borderWidth : '0px';
 		ecS.borderColor = '#696969';
 		ecS.background = (this.isStrVal(background)) ? background : 'transparent none';
 		ecS.margin = (this.isStrVal(margin)) ? margin : '0px';
 		ecS.padding = (this.isStrVal(padding)) ? padding : '0px';
 		ecS.whiteSpace = (this.isStrVal(whiteSpace)) ? whiteSpace : 'normal';
 		if (this.isStrVal(cursor)) { ecS.cursor = cursor; }
		return emptyContainer;
	},

	Range : function (start, end) {
		this.start = typeof start === 'number' ? start : 0;
		this.end = typeof end === 'number' ? end : 0;
	},

	arraySubarraySimple : function (start, end) {
		return this.slice(start, end);
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
		if (ZT.uInt8ArraySupported) {
			return new Uint8Array(array, offset);
		} else {
			return new ZT.Utils.TypedArray(array, offset);
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
		result.subarray = ZT.Utils.arraySubarraySimple;
		result.buffer = result;
		result.byteLength = result.length;
		result.set = ZT.Utils.setSimple;
		if (typeof arg1 === 'object' && arg1.buffer) { result.buffer = arg1.buffer; }
		return result;
	},

	setSimple : function (array, offset) {
		if (arguments.length < 2) { offset = 0; }
		for (var i = 0, n = array.length; i < n; ++i, ++offset) {
			this[offset] = array[i] & 0xFF;
		}
	},

	encodeBase64 : function (data) {
		var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = '', tmp_arr = [];
		if (!data) { return data; }
		do {
		    o1 = data[i++];
		    o2 = data[i++];
		    o3 = data[i++];
		    bits = o1 << 16 | o2 << 8 | o3;
		    h1 = bits >> 18 & 0x3f;
		    h2 = bits >> 12 & 0x3f;
		    h3 = bits >> 6 & 0x3f;
		    h4 = bits & 0x3f;
		    tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
		} while (i < data.length);
		enc = tmp_arr.join('');
		var r = data.length % 3;
		return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
	},
	
	defineObjectProperty : function (obj, name, def) {
		if (ZT.definePropertySupported) {
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
	},
	
	createImageElementFromBytes : function (src, callback) {
		var image = new Image();
		var timeout = null;
		var timeoutFunc = function () {
			console.log('Image timed out'); 
			complete(false);
		};
		function complete (result) {
			image.onload = null;
			image.onabort = null;
			image.onerror = null;
			if (timeout) { window.clearTimeout(timeout); }
			window.setTimeout(function () { callback(image); }, 1);
		};
		var successFunction = function () { complete(true); };
		var errorFunction = function () { complete(false); };
		image.onload = successFunction;
		image.onabort = errorFunction;
		image.onerror = errorFunction;
		timeout = window.setTimeout(timeoutFunc, 30000);
		image.src = src;
	}	
};