/**::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
@license Zoomify Image Viewer, version on line 25 below. Copyright Zoomify, Inc., 1999-2018. All rights reserved. You may
use this file on private and public websites, for personal and commercial purposes, with or without modifications, so long as this
notice is included. Redistribution via other means is not permitted without prior permission. Additional terms apply. For complete
license terms please see the Zoomify License Agreement in this product and on the Zoomify website at www.zoomify.com.
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
*/

/*
The functions below are listed in groups in the following order: Initialization, ZoomifyImageViewer,
ZoomifyViewport, ZoomifyToolbar, ZoomifyNavigator, ZoomifyGallery, ZoomifyRuler, NetConnector, 
and Utils.  Within each group the functions appear in the order in which they are first called.  Each 
group serves as a component with its own global variables and functions for sizing, positioning, and 
interaction. Shared variables global at the scope of the Zoomify library are declared in a single
'Z' object which provides easy access while preventing naming conflicts with other code sources.
*/

(function () {
	// Declare global-to-page object to contain global-to-viewer elements.
	var global = (function () { return this; } ).call();
	global.Z = {};
})();

// Debug value: Display in browser console or use function to get value.
Z.version = '5.23 ExpressMulti';
Z.getVersion = function () { return Z.version; }

// Debug options:
// Enable trapping of errors in Safari on Windows: window.onerror = function (error) { alert(error); };
// Identify codeflow without callstack in debugger: console.log(arguments.callee.caller.toString());
// Display code processing in debugger: debugger;



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::: INIT FUNCTIONS ::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

// Ensure needed browser event functions exist. Initialize Zoomify only on first call to showImage.
// Create Viewer on content load rather than full page load if supported by browser. 
// If showImage called by user interaction after page is loaded, call create directly.
Z.showImage = function (containerID, imagePath, optionalParams) {
		
	// Ensure needed browser events and functions exist, declare variables global to Zoomify and set values based on browser features.
	if (!Z.showImage.initialized) {
		Z.showImage.initialized = true;
		Z.Utils.addCrossBrowserEvents();
		Z.Utils.addCrossBrowserFunctions();
		Z.Utils.declareZoomifyGlobals();
		Z.Utils.detectBrowserFeatures();
	}
		
	if (document.readyState == 'complete') {
		createViewer();
	} else {
		Z.Utils.addEventListener(document, 'DOMContentLoaded', createViewer);
		Z.Utils.addEventListener(window, 'load', createViewer);
	}

	function createViewer () {
		// Ensure showImage called only once during page load.
		Z.Utils.removeEventListener(document, 'DOMContentLoaded', createViewer);
		Z.Utils.removeEventListener(window, 'load', createViewer);

		// Create Zoomify Viewer with unique instance ID.
		var zvID = 'Viewer';
		if (typeof optionalParams !== 'undefined' && optionalParams !== null && optionalParams != '') {
			var zvIDIndex = optionalParams.indexOf('zViewerID');
			if (zvIDIndex != -1) {
				Z.multipleViewers = true; // Do not wait to count second instance, assume many based on use of ID parameter.
				var paramsAfter = optionalParams.substring(zvIDIndex, optionalParams.length);
				var zvIDStart = paramsAfter.indexOf('=') + zvIDIndex + 1;
				var delimEnd = paramsAfter.indexOf('&');
				var zvIDEnd = (delimEnd != -1) ? delimEnd + zvIDIndex : optionalParams.length;
				var zvID = optionalParams.substring(zvIDStart, zvIDEnd);
			}
		}
		Z.viewerCounter++;
		if (Z.viewerCounter > 1 && zvID == 'Viewer') { zvID += '_' + containerID; }
		Z[zvID] = new Z.ZoomifyImageViewer(containerID, imagePath, optionalParams);
	}
}



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::: VIEWER FUNCTIONS ::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.ZoomifyImageViewer = function (containerID, imagePath, optionalParams) {
	var thisViewer = this;
	var viewerStatus = [];
	
	// Declare variables global to Viewer.
	declareViewerGlobals();
	
	// Set viewer unique ID property and short name var.
	thisViewer.viewerInternalID = Z.viewerCounter - 1;
	var zvIntID = thisViewer.viewerInternalID.toString();
	
	// Setting of callbacks and permission function implemented as function of Z global object for early and global support.
	this.setCallback = function (callbackEvent, callbackFunction) {
		if (typeof thisViewer.callbacks === 'undefined') { thisViewer.callbacks = []; }
		var index = Z.Utils.arrayIndexOfObjectTwoValues(thisViewer.callbacks, 'callbackEvent', callbackEvent, null, 'callbackFunction', callbackFunction);
		if (index == -1) { index = thisViewer.callbacks.length; }
		thisViewer.callbacks[index] = { callbackEvent:callbackEvent, callbackFunction:callbackFunction };
	}
	
	// Support parameters in XML file rather than as HTML string.
	this.loadParametersXML = function () {
		thisViewer.xmlParametersParsing = true;
		var netConnector = new Z.NetConnector(thisViewer);
		var XMLPath = Z.Utils.cacheProofPath(thisViewer.xmlParametersPath);
		netConnector.loadXML(XMLPath);
	}

	// Debug options:
	//thisViewer.setCallback('viewUpdateComplete', function () { console.log('View update complete!'); } );
	//thisViewer.setCallback('labelCreatedGetInternalID', function () { console.log('Label created!'); } );

	this.setEditPermissionFunction = function (permissionFunction) {
		thisViewer.externalEditPermissionFunction = permissionFunction;
		// Debug option: thisViewer.setEditPermissionFunction(function () { return true; } );
		// Debug option: thisViewer.setEditPermissionFunction(function () { return false; } );
		// Debub option: thisViewer.setEditPermissionFunction(function () { console.log('asking'); } );
	}

	this.clearCallback = function (callbackEvent, callbackFunction) {
		var index = Z.Utils.arrayIndexOfObjectTwoValues(thisViewer.callbacks, 'callbackEvent', callbackEvent, null, 'callbackFunction', callbackFunction);
		if (index != -1) {
			thisViewer.callbacks = Z.Utils.arraySplice(thisViewer.callbacks, index, 1);
		}
	}

	// Prepare image path, or, if optional XML parameters path is set using image path parameter, prepare to parse XML for image path and any optional parameters.
	var imagePathProvided = (typeof imagePath !== 'undefined' && Z.Utils.stringValidate(imagePath));
	var optionalParamsIncludeIIIFServer = (typeof optionalParams !== 'undefined')
		&& ((typeof optionalParams === 'string' && optionalParams.indexOf('zIIIFServer') != -1)
			|| (typeof optionalParams === 'object' && typeof optionalParams['zIIIFServer'] !== 'undefined'));
	if (imagePathProvided && imagePath.indexOf('zXMLParametersPath') != -1) {
		var xmlParamsPath = imagePath.substring(19, imagePath.length);
		thisViewer.xmlParametersPath = Z.Utils.stringRemoveTrailingSlashCharacters(xmlParamsPath);
	} else if (optionalParamsIncludeIIIFServer) {
		thisViewer.imagePath = 'IIIFImageServer';
	} else if (imagePathProvided) {
		thisViewer.imagePath = Z.Utils.stringRemoveTrailingSlashCharacters(imagePath);
	} else {
		thisViewer.imagePath = null;
	}

	// Process optional parameters.
	if (typeof optionalParams !== 'undefined') {
		if (typeof optionalParams === 'string') {
			// For optional parameters passed as strings, various escaping alternatives handled here for '&' concatenation delimiter:
			// \u0026 handled by browser, %26 handled by unescape (deprecated), &#38; and &#038; and &amp; handled by function stringUnescapeAmpersandCharacters.
			var optionalParamsUnescaped = unescape(optionalParams);
			var optionalParamsFullyUnescaped = Z.Utils.stringUnescapeAmpersandCharacters(optionalParamsUnescaped);
			thisViewer.parameters = Z.Utils.parseParameters(optionalParamsFullyUnescaped);
		} else {
			// For optional parameters passed as objects, above escape handling not required.
			thisViewer.parameters = Z.Utils.parseParameters(optionalParams);
		}

		// Debug options:
		// console.log('optionalParamsRaw: ' + optionalParams);
		// console.log('optionalParamsUnescaped: ' + optionalParamsUnescaped);
		// console.log('optionalParamsFullyUnescaped: ' + optionalParamsFullyUnescaped);
		// console.log('thisViewer.parameters: ' + thisViewer.parameters);
	}

	// Create Viewer display area as application environment for Viewport, Toolbar and Navigator.
	thisViewer.ViewerDisplay = Z.Utils.createContainerElement(zvIntID, 'div', 'ViewerDisplay', 'inline-block', 'relative', 'hidden', '100%', '100%', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', 'pointer');
	thisViewer.pageContainerID = containerID;
	thisViewer.pageContainer = document.getElementById(thisViewer.pageContainerID);
	var containerS = Z.Utils.getElementStyle(thisViewer.pageContainer);
	
	// Prevent selection of elements within Viewer, not including annotation panel text.
	Z.Utils.preventSelection(thisViewer.ViewerDisplay);

	// Get container dimensions. Handle standard size values, percents, non-numerics, and non-standard percents.
	var containerDims = Z.Utils.getContainerSize(thisViewer.pageContainer, thisViewer.ViewerDisplay);
	thisViewer.viewerW = containerDims.x;
	thisViewer.viewerH = containerDims.y;
		
	// Clear container and append Viewer.
	thisViewer.pageContainer.innerHTML = '';
	thisViewer.pageContainer.appendChild(thisViewer.ViewerDisplay);

	// Set global value to allow function initializeViewerEventListeners to enable responsive sizing if not disabled by HTML parameter zAutoResize=0 and if enabled by % container dimensions.
	thisViewer.autoResize = (thisViewer.autoResize || Z.Utils.isElementFluid(thisViewer.pageContainer));
	var autoResizeSkipDuration = parseInt(Z.Utils.getResource('DEFAULT_AUTORESIZESKIPDURATION'), 10);
	var autoResizeSkipTimer;

	// Set viewer variable for mousewheel support.
	thisViewer.mouseWheelCompleteDuration = parseInt(Z.Utils.getResource('DEFAULT_MOUSEWHEELCOMPLETEDURATION'), 10);
	
	// Parse web page parameters and create Zoomify Viewer.
	thisViewer.setCallback('readyConfigureViewer', configureViewer);
	initializeViewer();
	
	this.initializeViewer = function () {
		initializeViewer();
	}
	
	function initializeViewer () {
		if (thisViewer.xmlParametersPath && !thisViewer.parameters) {
			// Image path contains parameters XML path. The function loadParametersXML calls loadXML and sets receiveResponse to call parseParametersXML which re-calls this initialize function.
			thisViewer.loadParametersXML();

		} else if (thisViewer.parameters !== null && typeof thisViewer.parameters['zXMLParametersPath'] !== 'undefined') {
			// Image path used but third parameter is meta-parameter that substitutes XML parameter file for HTML parameters.
			// In this case call to setParameters in next line calls loadParametersXML which calls loadXML and sets receiveResponse to call parseParametersXML which re-calls this initialize function.

		} else { // Image path used. No parameters XML file.
			setParameters(thisViewer.parameters);
			
			// Display copyright text for user confirmation if optional parameter set.
			if (Z.Utils.stringValidate(thisViewer.copyrightPath)) { enforceCopyright(); }
			validateCallback('readyConfigureViewer');

			// If in any debug mode, present basic debugging features (trace panel, globals dialog).
			if (thisViewer.debug == 1 || thisViewer.debug == 2 || thisViewer.debug == 3) { trace(Z.Utils.getResource('UI_TRACEDISPLAYDEBUGINFOTEXT'), false, true); }
		}	
	}
		
	validateCallback('readyConfigureViewer');
	
	thisViewer.configureViewer = function () {
		configureViewer();
	}

	// Create Viewport or load imageSet XML to determine how many Viewports to create.
	function configureViewer () {
		if (viewerConfigureReady()) {
		
			if (!getStatus('configureCalled')) {
				setStatus('configureCalled', true);

				// Set configuration functions to execute on initialization of only Viewport or last Viewport.
				var initCallback = (!thisViewer.imageSet) ? 'initializedViewport' : 'initializedViewer';
				function initCallbackFunction () {
					thisViewer.clearCallback(initCallback, initCallbackFunction);
					initializeViewerEventListeners();

					// Use top viewport if multiple but do not use current pointer for overlays because it changes on interaction.
					var topVP = thisViewer['Viewport' + (thisViewer.imageSetLength - 1).toString()];
					var vpControl = (thisViewer.overlays) ? topVP : thisViewer.viewportCurrent;
					configureComponents(vpControl);
				}
				thisViewer.setCallback(initCallback, initCallbackFunction);

				// Set message clearing callback to execute on drawing complete of only Viewport or last Viewport.
				function viewerReadyCallbackFunction () {
					thisViewer.clearCallback('readyViewer', viewerReadyCallbackFunction);
					var msgTxt = (thisViewer.comparison) ? Z.Utils.getResource('ALERT_LOADINGIMAGESETCOMPARE') : (thisViewer.overlays) ? Z.Utils.getResource('ALERT_LOADINGIMAGESETOVERLAY') : (thisViewer.animation) ? Z.Utils.getResource('ALERT_LOADINGIMAGESETANIMATION') : Z.Utils.getResource('ALERT_LOADINGIMAGESETSLIDES');
					var msgTxt2 = Z.Utils.getResource('ALERT_LOADINGANNOTATIONS');
					if (getMessage() == msgTxt || getMessage() == msgTxt2) {
						thisViewer.hideMessage();
					}
					// Finish precaching of backfile tiles if delayed for faster image set or multi-image initial display.
					var vpID = thisViewer.Viewport.getViewportID();
					if (Z.multipleViewers || (thisViewer.imageSet && !thisViewer.comparison && vpID != thisViewer.imageSetStart)) { 
						precacheBackfillTilesDelayed();
					}

					// Alternative implementation: Finish precaching here for slidestacks but in function viewportSelect for animations.
					//if (thisViewer.slidestack) { precacheBackfillTilesDelayed(); }

					// Sync counter tracking.
					if (thisViewer.tracking) { thisViewer.viewportCurrent.syncTrackingToViewport(); }
				}

				thisViewer.setCallback('readyViewer', viewerReadyCallbackFunction);
				if (!thisViewer.imageSet) {
					thisViewer.Viewport = new ZoomifyViewport(); // Enable references in all other functions that are modified for ImageSet support
					thisViewer.viewportCurrent = thisViewer.Viewport;
					Z.Viewport = thisViewer.Viewport;

				} else {
					var msgTxt = (thisViewer.comparison) ? Z.Utils.getResource('ALERT_LOADINGIMAGESETCOMPARE') : (thisViewer.overlays) ? Z.Utils.getResource('ALERT_LOADINGIMAGESETOVERLAY') : (thisViewer.animation) ? Z.Utils.getResource('ALERT_LOADINGIMAGESETANIMATION') : Z.Utils.getResource('ALERT_LOADINGIMAGESETSLIDES');
					showMessage(msgTxt, false, null, 'center');

					if (typeof thisViewer.overlayJSONObject !== 'undefined' && typeof thisViewer.overlayJSONObject === 'object' && thisViewer.overlayJSONObject !== null) {
						var xmlText = Z.Utils.jsonConvertObjectToXMLText(thisViewer.overlayJSONObject);
						var xmlDoc = Z.Utils.xmlConvertTextToDoc(xmlText);
						thisViewer.parseImageSetXML(xmlDoc, 'overlay');

					} else {
						var XMLPath;
						var netConnector = new Z.NetConnector(thisViewer);
						if (thisViewer.imageSetPath.toLowerCase().substring(thisViewer.imageSetPath.length - 4, thisViewer.imageSetPath.length) != '.xml') {
							var xmlFile = (thisViewer.animation) ? Z.Utils.getResource('DEFAULT_XMLFILEANIMATION') : (Z.overlay) ? Z.Utils.getResource('DEFAULT_XMLFILEOVERLAY') : Z.Utils.getResource('DEFAULT_XMLFILESLIDESTACK');
							thisViewer.imageSetPath = thisViewer.imageSetPath + '/' + xmlFile;
						}
						XMLPath = Z.Utils.cacheProofPath(thisViewer.imageSetPath);
						netConnector.loadXML(XMLPath);
					}
				}
			}
			
		}
	}
	
	function viewerConfigureReady () {
		var configureReady = false;
		var localSingleFileOK = (Z.singleFileEnabled == false || !Z.localUseEnabled || Z.localFileSelected);
		var userLoginOK = (thisViewer.userLogin === null || Z.Utils.stringValidate(thisViewer.userName));
		var copyrightOK = (thisViewer.copyrightPath === null || Z.Utils.stringValidate(thisViewer.copyright));
		configureReady = (localSingleFileOK && userLoginOK && copyrightOK);		
		return configureReady;
	}
	
	// Clear components being set with new parameters. Navigator, Toolbar, and Gallery parameters 
	// have a common root. Clearing custom help is not necessary because content is simply reloaded. 
	// Toolbar parameters include some with a common root but many without.
	this.validateComponents = function (viewport) {
		if (typeof thisViewer.parameters !== 'undefined' && thisViewer.parameters !== null) {
			var newParams = Object.keys(thisViewer.parameters).toString();
			thisViewer.clearComponent(thisViewer.Navigator);
			thisViewer.clearComponent(thisViewer.Gallery);
			thisViewer.clearComponent(thisViewer.Ruler);
			thisViewer.clearComponent(thisViewer.Toolbar);
		}
	}
	
	// Create Toolbar, Navigator, and Ruler
	this.configureComponents = function (viewport) {
		configureComponents(viewport);
	}
	
	function configureComponents (viewport) {	
		if (thisViewer.toolbarVisible > 0 && !thisViewer.Toolbar) { thisViewer.Toolbar = new thisViewer.ZoomifyToolbar(viewport); }
		if (thisViewer.navigatorVisible > 0) {
			if (!thisViewer.Navigator) { thisViewer.Navigator = new thisViewer.ZoomifyNavigator(viewport); }
			if (thisViewer.Navigator) { thisViewer.Navigator.validateNavigatorGlobals(); }
			if (thisViewer.comparison && !thisViewer.Navigator2) { thisViewer.Navigator2 = new thisViewer.ZoomifyNavigator(thisViewer.Viewport1); }
			if (thisViewer.Navigator2) { thisViewer.Navigator2.validateNavigatorGlobals(); }
		}
		if (thisViewer.galleryVisible > 0) {
			if (!thisViewer.Gallery) { thisViewer.Gallery = new thisViewer.ZoomifyGallery(viewport); }
			if (thisViewer.Gallery) { thisViewer.Gallery.validateGalleryGlobals(); }
		}
		if (thisViewer.rulerVisible > 0 && !thisViewer.Ruler) { thisViewer.Ruler = new thisViewer.ZoomifyRuler(viewport); }
		if (thisViewer.helpCustom) { loadHelp(); }
	}

	function loadHelp () {
		var netConnector = new Z.NetConnector(thisViewer);
		netConnector.loadHTML(thisViewer.helpPath, thisViewer.receiveHelpHTML, null, 'loadHTML');
	}

	this.receiveHelpHTML = function (xhr) {
		if (xhr.readyState == 4 && xhr.status == 200 && Z.Utils.stringValidate(xhr.responseText)) {
			thisViewer.helpContent = xhr.responseText;
		}
	}

	this.setSizeAndPosition = function (width, height, left, top, update) {			
		thisViewer.viewerW = width;
		thisViewer.viewerH = height;
		thisViewer.ViewerDisplay.style.width = width + 'px';
		thisViewer.ViewerDisplay.style.height = height + 'px';
		if (thisViewer.Viewport && thisViewer.Viewport.getStatus('initializedViewport')) {
			thisViewer.Viewport.setSizeAndPosition(width, height, left, top);
		}
		
		var toolbarTopAdj = (!thisViewer.toolbarBackgroundVisible) ? parseInt(Z.Utils.getResource('DEFAULT_TOOLBARBACKGROUNDVISIBLEADJUST'), 10) : 0;
		var toolbarTop = (thisViewer.toolbarPosition == 1) ? height - thisViewer.toolbarH - toolbarTopAdj : 0 + toolbarTopAdj;
		
		if (thisViewer.Toolbar && thisViewer.ToolbarDisplay && thisViewer.Toolbar.getInitialized()) {
			thisViewer.Toolbar.setSizeAndPosition(width, null, null, toolbarTop);
			if (thisViewer.toolbarVisible != 0 && thisViewer.toolbarVisible != 8) { thisViewer.Toolbar.show(true); }
		}
		if (thisViewer.Navigator && thisViewer.Navigator.getInitialized()) {
			var navLeft = (thisViewer.navigatorL == 0) ? left: (thisViewer.navigatorL + thisViewer.navigatorW > width) ? width - thisViewer.navigatorW : thisViewer.navigatorL;
			var navTop = (thisViewer.navigatorT != 0) ? thisViewer.navigatorT : top;
			thisViewer.Navigator.setSizeAndPosition(null, null, navLeft, navTop, thisViewer.navigatorFit);
			if (thisViewer.navigatorVisible > 1) {
				thisViewer.Navigator.setVisibility(true);
				if (thisViewer.comparison && thisViewer.Navigator2) {
					var left2 = width - thisViewer.navigatorW;
					thisViewer.Navigator2.setSizeAndPosition(null, null, left2, top, thisViewer.navigatorFit);
					thisViewer.Navigator2.setVisibility(true);
				}
			}
		}
		if (thisViewer.imageList) {
			if (thisViewer.Viewport.getStatus('initializedImageList')) {
				thisViewer.Viewport.setSizeAndPositionImageList();
			}
		}
		if (Z.slideList && typeof slideList !== 'undefined' && slideList !== null) {
			var listCoords = thisViewer.Viewport.calculateSlideListCoords(thisViewer.viewerW, thisViewer.viewerH); // viewH allows for toolbar height if static in viewer display area.
			slideList.style.left = listCoords.x + 'px';
			slideList.style.top = listCoords.y + 'px';
		}
		if (thisViewer.Gallery && thisViewer.Gallery.getInitialized()) {
			thisViewer.Gallery.setSizeAndPosition(width, height, left, top);
			if (thisViewer.galleryAutoShowHide) { thisViewer.Gallery.setVisibility(true); }
		}
		if (update) { thisViewer.Viewport.updateView(true); }
	}

	function declareViewerGlobals () {
		// PAGE & VIEWER INIT
		thisViewer.pageContainerID = null;
		thisViewer.pageContainer = null;
		thisViewer.viewerID = null;
		thisViewer.viewerInternalID = null;		
		
		// IMAGE & SKIN
		thisViewer.imagePath = null;
		thisViewer.imageFilename = null;
		thisViewer.imagePath2 = null;
		thisViewer.parameters = null;
		thisViewer.xmlParametersPath = null;
		thisViewer.xMLParametersPath = null; // Lower case 'xml' version above used internally. This version prevents error message in function setParameters.
		thisViewer.xmlParametersParsing = null;
		thisViewer.xMLParametersParsing = null; // Lower case 'xml' version above used internally. This version prevents error message in function setParameters.
		thisViewer.skinPath = null;
		thisViewer.skinMode = null;

		// VIEWER OPTIONS & DEFAULTS
		thisViewer.onReady = null;
		thisViewer.onAnnotationReady = null;
		thisViewer.initialX = null;
		thisViewer.initialY = null;
		thisViewer.initialZ = null;
		thisViewer.initialZoom = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.minZ = null;
		thisViewer.minZoom = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.maxZ = null;
		thisViewer.maxZoom = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.zoomSpeed = null;
		thisViewer.panSpeed = null;
		thisViewer.smoothPan = null;
		thisViewer.smoothPanEasing = null;
		thisViewer.smoothZoom = null;
		thisViewer.smoothZoomEasing = null;
		thisViewer.smoothPanGlide = null;
		thisViewer.autoResize = null;
		thisViewer.fadeIn = null;
		thisViewer.fadeInSpeed = null;
		thisViewer.toolbarInternal = null;
		thisViewer.toolbarVisible = null;
		thisViewer.toolbarBackgroundVisible = null;
		thisViewer.toolbarAutoShowHide = null;
		thisViewer.toolbarW = null;
		thisViewer.toolbarH = null;
		thisViewer.toolbarPosition = null;
		thisViewer.navigatorVisible = null;
		thisViewer.navigatorW = null;
		thisViewer.navigatorWidth = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.navigatorH = null;
		thisViewer.navigatorHeight = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.navigatorL = null;
		thisViewer.navigatorLeft = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.navigatorT = null;
		thisViewer.navigatorTop = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.navigatorFit = null;
		thisViewer.navigatorRectangleColor = null;
		thisViewer.GalleryScrollPanel = null;
		thisViewer.galleryVisible = null;
		thisViewer.galleryAutoShowHide = null;
		thisViewer.galleryW = null;
		thisViewer.galleryH = null;
		thisViewer.galleryL = null;
		thisViewer.galleryT = null;
		thisViewer.galleryPosition = null;
		thisViewer.galleryRectangleColor = null;
		thisViewer.mouseIsDownGallery = null;
		thisViewer.clickZoom = null;
		thisViewer.doubleClickZoom = null;
		thisViewer.doubleClickDelay = null;
		thisViewer.clickPan = null;
		thisViewer.zoomAndPanInProgressID = null;
		thisViewer.clickZoomAndPanBlock = false;
		thisViewer.mousePan = null;
		thisViewer.keys = null;
		thisViewer.constrainPan = null;
		thisViewer.constrainPanLimit = null;
		thisViewer.constrainPanStrict = null;
		thisViewer.panBuffer = null;
		thisViewer.tooltipsVisible = null;
		thisViewer.helpVisible = null;
		thisViewer.helpPath = null;
		thisViewer.helpCustom = false;
		thisViewer.helpContent = null;
		thisViewer.helpW = null;
		thisViewer.helpWidth = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.helpH = null;
		thisViewer.helpHeight = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.helpL = null;
		thisViewer.helpLeft = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.helpT = null;
		thisViewer.helpTop = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.minimizeVisible = null;
		thisViewer.sliderZoomVisible = null;
		thisViewer.sliderVisible = null; // Deprecated. Now thisViewer.sliderZoomVisible. HTML parameter still zSliderVisible. This set here to prevent specific error message in function setParameters.
		thisViewer.zoomButtonsVisible = null;
		thisViewer.panButtonsVisible = null;
		thisViewer.resetVisible = null;

		thisViewer.fullViewVisible = null;
		thisViewer.fullScreenVisible = null;
		thisViewer.fullPageVisible = null;
		thisViewer.initialFullPage = null;
		thisViewer.fullPageInitial = null; // Deprecated. Set here to enable specific error message in function setParameters.
		thisViewer.fullScreenEntering = null;

		thisViewer.progressVisible = null;
		thisViewer.messagesVisible = null;
		thisViewer.logoVisible = null;
		thisViewer.logoLink = null;
		thisViewer.logoLinkURL = null;
		thisViewer.logoCustomPath = null;

		thisViewer.bookmarksGet = null;
		thisViewer.bookmarksSet = null;

		thisViewer.copyrightPath = null;
		thisViewer.copyright = null;
		
		thisViewer.watermarkPath = null;
		thisViewer.watermarks = null;

		thisViewer.virtualPointerVisible = null;
		thisViewer.virtualPointer = null;
		thisViewer.virtualPointerImage = null;
		thisViewer.virtualPointerPath = Z.Utils.getResource('DEFAULT_VIRTUALPOINTERPATH');

		thisViewer.crosshairsVisible = null;
		thisViewer.zoomRectangle = null;

		thisViewer.rulerVisible = null;
		thisViewer.units = null;
		thisViewer.unitsPerImage = null;
		thisViewer.pixelsPerUnit = null;
		thisViewer.sourceMagnification = null;
		thisViewer.magnification = null; //  Deprecated. Set here to enable specific error message in function setParameters.
		thisViewer.rulerListType = null;
		thisViewer.rulerW = null;
		thisViewer.rulerWidth = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.rulerH = null;
		thisViewer.rulerHeight = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.rulerL = null;
		thisViewer.rulerLeft = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.rulerT = null;
		thisViewer.rulerTop = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		thisViewer.measureVisible = false;
		thisViewer.rotationVisible = null;
		thisViewer.rotationFree = null;
		thisViewer.initialR = null;
		thisViewer.initialRotation = null; // Concise version above used internally. This long version prevents error message in function setParameters.

		thisViewer.imageListPath = null;
		thisViewer.imageList = null;
		thisViewer.imageListTitle = null;
		thisViewer.imageListFolder = null;
		thisViewer.imageListFileShared = false;
		thisViewer.imageSetImageListPath = null;
		thisViewer.imageListTimeout = null;

		thisViewer.screensaver = false;
		thisViewer.screensaverSpeed = null;
		thisViewer.tour = false;
		thisViewer.tourPath = null;
		thisViewer.tourListTitle = null;
		thisViewer.tourPlaying = null;
		thisViewer.tourStopping = false;

		thisViewer.comparison = false;
		thisViewer.comparisonPath = null; // Supports zComparisonPath parameter test.
		thisViewer.syncVisible = null;
		thisViewer.initialSync = null;
		thisViewer.syncComparison = null;

		thisViewer.slideshow = false;
		thisViewer.slidePath = null;
		thisViewer.slideListTitle = null;
		thisViewer.slideshowPlaying = null;
		thisViewer.slideshowStopping = null;
		thisViewer.slideTransitionTimeout = null;
		thisViewer.slideTransitionSpeed = null;
		thisViewer.slideOpacity = 0;

		thisViewer.audioContent = false;
		thisViewer.audioMuted = false;
		thisViewer.audioPlaying = null;
		thisViewer.audioNext = null;
		thisViewer.audioStopped = null;

		thisViewer.hotspots = false;
		thisViewer.hotspotPath = null;
		thisViewer.hotspotFolder = null;
		thisViewer.hotspotListTitle = null;
		thisViewer.hotspotsDrawOnlyInView = true;
		thisViewer.captionBoxes = false;
		thisViewer.captionsColorsDefault = true;
		thisViewer.captionOffset = null;

		thisViewer.annotations = false;
		thisViewer.annotationPath = null;
		thisViewer.annotationFolder = null;
		thisViewer.annotationXMLText = null;
		thisViewer.annotationJSONObject = null;
		thisViewer.annotationsAddMultiple = null;
		thisViewer.annotationsAutoSave = null;
		thisViewer.annotationsAutoSaveImage = null;
		thisViewer.annotationPanelVisible = null; // Include panel in interface.
		thisViewer.annotationPanelVisibleState = false; // Show or hide panel currently.
		thisViewer.labelIconsInternal = null;
		
		thisViewer.saveButtonVisible = null;

		thisViewer.labelClickSelect = null;
		thisViewer.simplePath = false;
		thisViewer.noPost = false;
		thisViewer.noPostDefaults = false;
		thisViewer.unsavedEditsTest = true;

		thisViewer.maskVisible = null;
		thisViewer.maskScale = null;
		thisViewer.maskBorder = null;
		thisViewer.maskingSelection = false;
		thisViewer.maskFadeTimeout = null;
		thisViewer.maskFadeSpeed = null;
		thisViewer.maskOpacity = 0;
		thisViewer.maskClearOnUserAction = null;

		thisViewer.externalEditPermissionFunction = null; // Value must be function to be invoked. Function must return true or false.
		thisViewer.annotationSort = 'none';

		thisViewer.saveHandlerPath = null;
		thisViewer.saveImageHandlerPath = null;
		thisViewer.saveImageFull = null;
		thisViewer.postingXML = false;
		thisViewer.postingImage = false;

		thisViewer.coordinatesVisible = null;
		thisViewer.geoCoordinatesPath = null;
		thisViewer.geoCoordinatesVisible = null;
		thisViewer.geoCoordinatesFolder = null;

		thisViewer.preloadVisible = null;

		thisViewer.imageFilters = null;
		thisViewer.imageFiltersVisible = null;
		thisViewer.initialImageFilters = null;
		thisViewer.brightnessVisible = null;
		thisViewer.contrastVisible = null;
		thisViewer.sharpnessVisible = null;
		thisViewer.blurrinessVisible = null;
		thisViewer.colorRedVisible = null;
		thisViewer.colorGreenVisible = null;
		thisViewer.colorBlueVisible = null;
		thisViewer.colorRedRangeVisible = null;
		thisViewer.colorGreenRangeVisible = null;
		thisViewer.colorBlueRangeVisible = null;
		thisViewer.gammaVisible = null;
		thisViewer.gammaRedVisible = null;
		thisViewer.gammaGreenVisible = null;
		thisViewer.gammaBlueVisible = null;
		thisViewer.hueVisible = null;
		thisViewer.saturationVisible = null;
		thisViewer.lightnessVisible = null;
		thisViewer.whiteBalanceVisible = null;
		thisViewer.normalizeVisible = null;
		thisViewer.equalizeVisible = null;
		thisViewer.noiseVisible = null;
		thisViewer.grayscaleVisible = null;
		thisViewer.thresholdVisible = null;
		thisViewer.inversionVisible = null;
		thisViewer.edgesVisible = null;
		thisViewer.sepiaVisible = null;	

		thisViewer.saveImageFull = null;
		thisViewer.saveImageFilename = null;
		thisViewer.saveImageFormat = null;
		thisViewer.saveImageCompression = null;
		thisViewer.saveImageBackColor = null;

		thisViewer.tracking = false;
		thisViewer.trackingPath = null;
		thisViewer.trackingFolder = null;
		thisViewer.trackingPathProvided = false;
		thisViewer.trackingEditMode = false;
		thisViewer.trackingFileShared = false;
		thisViewer.imageSetTrackingPath = null;
		thisViewer.trackingPanelPosition = null;
		thisViewer.trackingCounts = [];
		thisViewer.trackingTypeCurrent = '0';
		thisViewer.trackingOverlayVisible = false;
		thisViewer.initialTrackingOverlayVisible = null;
		thisViewer.trackingCellCurrent = null;
		thisViewer.trackingPanelVisible = null; // Include panel in interface.
		thisViewer.trackingPanelVisibleState = false; // Show or hide panel currently.
		
		thisViewer.userName = null;
		thisViewer.userInitials = null;
		thisViewer.userLogin = null;
		thisViewer.userNamePrompt = null;
		thisViewer.userNamePromptRetry = null;
		thisViewer.userPath = null;
		thisViewer.userFolder = null;
		thisViewer.userPathProvided = false;
		thisViewer.userList = [];
		thisViewer.userLogging = false;
		thisViewer.UserPanel = null;
		thisViewer.userPanelVisible = null; // Include panel in interface.
		thisViewer.userPanelVisibleState = false; // Show or hide panel currently.

		thisViewer.canvas = null;
		thisViewer.baseZIndex = null;
		thisViewer.debug = null;
		thisViewer.imageProperties = null;
		thisViewer.serverIP = null;
		thisViewer.serverPort = null;
		thisViewer.tileHandlerPath = null;
		thisViewer.tileHandlerPathFull = null;

		thisViewer.iiifInfoJSONObject =null;
		thisViewer.iiifScheme = null;
		thisViewer.iIIFScheme = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		thisViewer.iiifServer = null;
		thisViewer.iIIFServer = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		thisViewer.iiifPrefix = null;
		thisViewer.iIIFPrefix = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		thisViewer.iiifIdentifier = null;
		thisViewer.iIIFIdentifier = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		thisViewer.iiifRegion = null;
		thisViewer.iIIFRegion = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		thisViewer.iiifSize = null;
		thisViewer.iIIFSize = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		thisViewer.iiifRotation = null;
		thisViewer.iIIFRotation = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		thisViewer.iiifQuality = null;
		thisViewer.iIIFQuality = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		thisViewer.iiifFormat = null;
		thisViewer.iIIFFormat = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.

		thisViewer.tileW = null;
		thisViewer.tileH = null;
		thisViewer.tileType = 'jpg';
		thisViewer.tilesPNG = null;  // Deprecated.  zTilesPNG now sets thisViewer.tileType above. Set here to enable specific error message in function setParameters.
		thisViewer.freehandVisible = null;
		thisViewer.textVisible = null;
		thisViewer.iconVisible = null;
		thisViewer.rectangleVisible = null;
		thisViewer.polygonVisible = null;
		thisViewer.captionTextColor = null;
		thisViewer.captionBackColor = null;
		thisViewer.polygonLineColor = null;
		thisViewer.polygonFillColor = null;
		thisViewer.captionTextVisible = true;
		thisViewer.captionBackVisible = true;
		thisViewer.polygonFillVisible = false;
		thisViewer.polygonLineVisible = true;

		thisViewer.annotationPathProvided = false;
		thisViewer.saveHandlerProvided = false;
		thisViewer.imageSetPathProvided = false;
		thisViewer.slidePathProvided = false;
		thisViewer.saveImageHandlerProvided = false;
		thisViewer.tileSource = null;
		thisViewer.requestTiles = false;
		thisViewer.tileSourceMultiple = null;
		thisViewer.pffJPEGHeadersSeparate = false;
		thisViewer.dziSubfoldersToSkip = null;		
		thisViewer.dziImagePropertiesFilename = null;
		thisViewer.dziImageSubfolder = null;
		thisViewer.focal = null;
		thisViewer.quality = null;
		thisViewer.markupMode = null; // Used only to ensure zMarkupMode validity test does not return 'undefined'.
		thisViewer.editMode = null; // Supported values: null, 'edit', 'markup'.
		thisViewer.editAdmin = false; // Supported values: false (default), true.
		thisViewer.editing = null; // Supported values: null, 'addPOI', 'editPOI', 'addLabel', 'editLabel', 'addNote', 'editNote'.
		thisViewer.labelMode = 'view'; // Supported values: 'view', 'freehand', 'text', 'icon', 'rectangle', 'polygon', 'measure'.
		thisViewer.editModePrior = thisViewer.editMode;
		thisViewer.xmlCallbackFunction = null;
		thisViewer.labelsClickDrag = false;
		thisViewer.sliderFocus = 'zoom';
		thisViewer.overlayPath = null; // Supports zOverlayPath parameter test.
		thisViewer.overlays = false;
		thisViewer.overlayJSONObject = null;
		thisViewer.overlaysInitialVisibility = null;
		thisViewer.animation = false;
		thisViewer.animationPath = null; // Supports zAnimationPath parameter test.
		thisViewer.animationCount = 0;
		thisViewer.animationAxis = null;
		thisViewer.animator = null;
		thisViewer.animationFlip = null;
		thisViewer.slidestack = false;
		thisViewer.slidestackPath = null; // Supports zSlidestackPath parameter test.
		thisViewer.imageSet = false;
		thisViewer.imageSetPath = null;
		thisViewer.imageSetObjects = [];
		thisViewer.imageSetListDP = [];
		thisViewer.imageSetList = null;	
		thisViewer.imageSetLength = null;
		thisViewer.imageSetListPosition = null;
		thisViewer.imageSetListTitle = null;
		thisViewer.imageSetStart = null;
		thisViewer.imageSetLoop = null;
		thisViewer.sliderImageSetVisible = null;
		thisViewer.mouseWheelParmeterProvided = null;
		thisViewer.mouseWheel = null;
		thisViewer.imageSetHotspotPath = null;
		thisViewer.hotspotFileShared = false;
		thisViewer.imageSetAnnotationPath = null;
		thisViewer.annotationFileShared = false;

		// VIEWER COMPONENTS & STATE VALUES
		thisViewer.messageDurationLong = parseInt(Z.Utils.getResource('DEFAULT_MESSAGEDURATIONLONG'), 10);
		thisViewer.messageDurationStandard = parseInt(Z.Utils.getResource('DEFAULT_MESSAGEDURATIONSTANDARD'), 10);
		thisViewer.messageDurationShort = parseInt(Z.Utils.getResource('DEFAULT_MESSAGEDURATIONSHORT'), 10);
		thisViewer.messageDurationVeryShort = parseInt(Z.Utils.getResource('DEFAULT_MESSAGEDURATIONVERYSHORT'), 10);
		thisViewer.Viewer = null;
		thisViewer.ViewerDisplay = null;
		thisViewer.Viewport = null;
		thisViewer.Toolbar = null;
		thisViewer.ToolbarDisplay = null;
		thisViewer.ToolbarMinimized = false;
		thisViewer.TooltipDisplay = null;
		thisViewer.Navigator = null;
		thisViewer.Navigator2 = null;
		thisViewer.NavigatorDisplay = null;
		thisViewer.MessageDisplay = null;
		thisViewer.messages = null;
		thisViewer.messageDisplayList = [];
		thisViewer.overlayMessage = null;
		thisViewer.CoordinatesDisplay = null;
		thisViewer.coordinates = null;
		thisViewer.coordinatesSave = null;
		thisViewer.CopyrightDisplay = null;
		thisViewer.AnnotationPanelDisplay = null;
		thisViewer.imageW = null;
		thisViewer.imageH = null;
		thisViewer.imageD = null;
		thisViewer.imageCtrX = null;
		thisViewer.imageCtrY = null;
		thisViewer.imageX = 0;
		thisViewer.imageY = 0;
		thisViewer.imageZ = 0;
		thisViewer.imageR = 0;
		thisViewer.priorX = 0;
		thisViewer.priorY = 0;
		thisViewer.priorZ = 0;
		thisViewer.priorR = 0;
		thisViewer.preventDupCall = false;
		thisViewer.fitZ = null;
		thisViewer.fillZ = null;
		thisViewer.zooming = 'stop';
		thisViewer.panningX = 'stop';
		thisViewer.panningY = 'stop';
		thisViewer.rotating = 'stop';
		thisViewer.fullView = false;
		thisViewer.fullViewPrior = false;
		thisViewer.interactive = true;
		thisViewer.useCanvas = true;
		thisViewer.expressParamsEnabled = null;
		thisViewer.proParamsEnabled = null;
		thisViewer.specialStorageEnabled = null;
		thisViewer.enterpriseParamsEnabled = null;
		thisViewer.updateViewPercent = 0;
		thisViewer.TraceDisplay = null;
		thisViewer.traces = null;
		thisViewer.mouseIsDown = false;
		thisViewer.buttonIsDown = false;
		thisViewer.keyIsDown = false;
		thisViewer.mouseWheelIsDown = false;
		thisViewer.mouseWheelCompleteDuration = null;
		thisViewer.mouseWheelCompleteTimer = null;
		thisViewer.mouseOutDownPoint = null;

		// ImageSet support.
		thisViewer.viewportCurrentID = 0;
		thisViewer.viewportCurrent = null;
		thisViewer.viewportChangeTimeout = null;
	}
	
	function setParameters (params) {
		var expressParamsEnableTest = Z.Utils.getResource('DEFAULT_EXPRESSPARAMETERSENABLETEST');
		var expressParamsDisableValue = Z.Utils.getResource('DEFAULT_EXPRESSPARAMETERSDISABLEVALUE');
		var expressParamsDisabledAlert = Z.Utils.getResource('DEFAULT_EXPRESSPARAMETERSDISABLEDALERT');
		thisViewer.expressParamsEnabled = (expressParamsEnableTest != expressParamsDisableValue) ? true : false;
		if (!thisViewer.expressParamsEnabled) {
			thisViewer.toolbarInternal = true;
			// Alternative implementation: full toolbar with link on Zoomify logo.
			//thisViewer.logoLinkURL = Z.Utils.getResource('UI_LOGOLINK');
		}

		var proParamsEnableTest = Z.Utils.getResource('DEFAULT_PROPARAMETERSENABLETEST');
		var proParamsDisableValue = Z.Utils.getResource('DEFAULT_PROPARAMETERSDISABLEVALUE');
		var proParamsDisabledAlert = Z.Utils.getResource('DEFAULT_PROPARAMETERSDISABLEDALERT');
		thisViewer.proParamsEnabled = (proParamsEnableTest != proParamsDisableValue) ? true : false;

		var specialStorageEnableTest = Z.Utils.getResource('DEFAULT_SPECIALSTORAGESUPPORTENABLETEST');
		var specialStorageDisableValue = Z.Utils.getResource('DEFAULT_SPECIALSTORAGESUPPORTDISABLEVALUE');
		var specialStorageDisabledAlert = Z.Utils.getResource('DEFAULT_SPECIALSTORAGESUPPORTDISABLEDALERT');
		thisViewer.specialStorageEnabled = (specialStorageEnableTest != specialStorageDisableValue) ? true : false;

		var enterpriseParamsEnableTest = Z.Utils.getResource('DEFAULT_ENTERPRISEPARAMETERSENABLETEST');
		var enterpriseParamsDisableValue = Z.Utils.getResource('DEFAULT_ENTERPRISEPARAMETERSDISABLEVALUE');
		var enterpriseParamsDisabledAlert = Z.Utils.getResource('DEFAULT_ENTERPRISEPARAMETERSDISABLEDALERT');
		thisViewer.enterpriseParamsEnabled = (enterpriseParamsEnableTest != enterpriseParamsDisableValue) ? true : false;

		if (thisViewer.viewerID === null) { thisViewer.viewerID = 0; }
		
		if (thisViewer.skinPath === null) { thisViewer.skinPath = Z.Utils.getResource('DEFAULT_SKINXMLPATH'); }
		if (thisViewer.skinMode === null) { thisViewer.skinMode = Z.Utils.getResource('DEFAULT_SKINMODE'); }

		if (!isNaN(parseFloat(Z.Utils.getResource('DEFAULT_INITIALX')))) { thisViewer.initialX = parseFloat(Z.Utils.getResource('DEFAULT_INITIALX')); }
		if (!isNaN(parseFloat(Z.Utils.getResource('DEFAULT_INITIALY')))) { thisViewer.initialY = parseFloat(Z.Utils.getResource('DEFAULT_INITIALY')); }
		if (!isNaN(parseFloat(Z.Utils.getResource('DEFAULT_INITIALZOOM')))) { thisViewer.initialZ = parseFloat(Z.Utils.getResource('DEFAULT_INITIALZOOM')); }
		if (thisViewer.minZ === null && !isNaN(parseFloat(Z.Utils.getResource('DEFAULT_MINZOOM')))) { thisViewer.minZ = parseFloat(Z.Utils.getResource('DEFAULT_MINZOOM')); }
		if (thisViewer.maxZ === null && !isNaN(parseFloat(Z.Utils.getResource('DEFAULT_MAXZOOM')))) { thisViewer.maxZ = parseFloat(Z.Utils.getResource('DEFAULT_MAXZOOM')); }
		if (thisViewer.zoomSpeed === null && !isNaN(parseFloat(Z.Utils.getResource('DEFAULT_ZOOMSPEED')))) { thisViewer.zoomSpeed = parseFloat(Z.Utils.getResource('DEFAULT_ZOOMSPEED')); }
		if (thisViewer.panSpeed === null && !isNaN(parseFloat(Z.Utils.getResource('DEFAULT_PANSPEED')))) { thisViewer.panSpeed = parseFloat(Z.Utils.getResource('DEFAULT_PANSPEED')); }
		if (thisViewer.fadeInSpeed === null && !isNaN(parseFloat(Z.Utils.getResource('DEFAULT_FADEINSPEED')))) { thisViewer.fadeInSpeed = parseFloat(Z.Utils.getResource('DEFAULT_FADEINSPEED')); }
		thisViewer.fadeIn = (thisViewer.fadeInSpeed > 0);

		if (thisViewer.navigatorVisible === null) { thisViewer.navigatorVisible = parseInt(Z.Utils.getResource('DEFAULT_NAVIGATORVISIBLE'), 10); }
		if (thisViewer.navigatorW === null) { thisViewer.navigatorW = parseInt(Z.Utils.getResource('DEFAULT_NAVIGATORWIDTH'), 10); }
		if (thisViewer.navigatorH === null) { thisViewer.navigatorH = parseInt(Z.Utils.getResource('DEFAULT_NAVIGATORHEIGHT'), 10); }
		if (thisViewer.navigatorL === null) { thisViewer.navigatorL = parseInt(Z.Utils.getResource('DEFAULT_NAVIGATORLEFT'), 10); }
		if (thisViewer.navigatorT === null) { thisViewer.navigatorT = parseInt(Z.Utils.getResource('DEFAULT_NAVIGATORTOP'), 10); }
		if (thisViewer.navigatorFit === null) { thisViewer.navigatorFit = Z.Utils.getResource('DEFAULT_NAVIGATORFIT'); }
		if (thisViewer.navigatorRectangleColor === null) { thisViewer.navigatorRectangleColor = Z.Utils.getResource('DEFAULT_NAVIGATORRECTANGLECOLOR'); }

		if (thisViewer.galleryVisible === null) { thisViewer.galleryVisible = (thisViewer.slideshow) ? parseInt(Z.Utils.getResource('DEFAULT_GALLERYVISIBLE'), 10) : parseInt(Z.Utils.getResource('DEFAULT_GALLERYVISIBLENOTSLIDESHOW'), 10); }
		if (thisViewer.galleryAutoShowHide === null) { thisViewer.galleryAutoShowHide = (thisViewer.galleryVisible == 2); }
		if (thisViewer.galleryW === null) { thisViewer.galleryW = parseInt(Z.Utils.getResource('DEFAULT_GALLERYWIDTH'), 10); }
		if (thisViewer.galleryH === null) { thisViewer.galleryH = parseInt(Z.Utils.getResource('DEFAULT_GALLERYHEIGHT'), 10); }
		if (thisViewer.galleryM === null) { thisViewer.galleryM = parseInt(Z.Utils.getResource('DEFAULT_GALLERYMARGIN'), 10); }
		if (thisViewer.galleryL === null) { thisViewer.galleryL = parseInt(Z.Utils.getResource('DEFAULT_GALLERYLEFT'), 10); }
		if (thisViewer.galleryT === null) { thisViewer.galleryT = parseInt(Z.Utils.getResource('DEFAULT_GALLERYTOP'), 10); }
		if (thisViewer.galleryPosition === null) { thisViewer.galleryPosition = parseFloat(Z.Utils.getResource('DEFAULT_GALLERYPOSITION')); }
		if (thisViewer.galleryRectangleColor === null) { thisViewer.galleryRectangleColor = Z.Utils.getResource('DEFAULT_GALLERYRECTANGLECOLO R'); }

		if (thisViewer.clickZoom === null) { thisViewer.clickZoom = (Z.Utils.getResource('DEFAULT_CLICKZOOM') != '0'); }
		if (thisViewer.doubleClickZoom === null) { thisViewer.doubleClickZoom = (Z.Utils.getResource('DEFAULT_DOUBLECLICKZOOM') != '0'); }
		if (thisViewer.doubleClickDelay === null) { thisViewer.doubleClickDelay = parseFloat(Z.Utils.getResource('DEFAULT_DOUBLECLICKDELAY')); }
		if (thisViewer.clickPan === null) { thisViewer.clickPan = (Z.Utils.getResource('DEFAULT_CLICKPAN') != '0'); }
		if (thisViewer.mousePan === null) { thisViewer.mousePan = (Z.Utils.getResource('DEFAULT_MOUSEPAN') != '0'); }
		if (thisViewer.constrainPan === null) { thisViewer.constrainPan = (Z.Utils.getResource('DEFAULT_CONSTRAINPAN') != '0'); }
		if (thisViewer.constrainPanLimit === null) { thisViewer.constrainPanLimit = parseInt(Z.Utils.getResource('DEFAULT_CONSTRAINPANLIMIT'), 10); }
		if (thisViewer.constrainPanStrict === null) { thisViewer.constrainPanStrict = (Z.Utils.getResource('DEFAULT_CONSTRAINPANSTRICT') != '0'); }
		if (thisViewer.panBuffer === null) { thisViewer.panBuffer = (Z.mobileDevice) ? parseFloat(Z.Utils.getResource('DEFAULT_PANBUFFERMOBILE')) : (thisViewer.rotationVisible) ? parseFloat(Z.Utils.getResource('DEFAULT_PANBUFFERROTATION')) : parseFloat(Z.Utils.getResource('DEFAULT_PANBUFFER')); }
		if (thisViewer.smoothPan === null) { thisViewer.smoothPan = (thisViewer.useCanvas && !thisViewer.comparison && Z.Utils.getResource('DEFAULT_SMOOTHPAN') != '0'); }
		if (thisViewer.smoothPanEasing === null) { thisViewer.smoothPanEasing = parseInt(Z.Utils.getResource('DEFAULT_SMOOTHPANEASING'), 10); }
		if (thisViewer.smoothPanGlide === null) { thisViewer.smoothPanGlide = parseInt(Z.Utils.getResource('DEFAULT_SMOOTHPANGLIDE'), 10); }
		if (thisViewer.smoothZoom === null) { thisViewer.smoothZoom = (Z.Utils.getResource('DEFAULT_SMOOTHZOOM') != '0'); }
		if (thisViewer.smoothZoomEasing === null) { thisViewer.smoothZoomEasing = parseInt(Z.Utils.getResource('DEFAULT_SMOOTHZOOMEASING'), 10); }

		if (thisViewer.keys === null) { thisViewer.keys = (Z.Utils.getResource( 'DEFAULT_KEYS') != '0'); }
		if (thisViewer.canvas === null) { thisViewer.canvas = (Z.Utils.getResource('DEFAULT_CANVAS') != '0'); }
		if (thisViewer.baseZIndex === null) { thisViewer.baseZIndex = parseInt(Z.Utils.getResource('DEFAULT_BASEZINDEX'), 10); }
		if (thisViewer.debug === null) { thisViewer.debug = parseInt(Z.Utils.getResource('DEFAULT_DEBUG'), 10); }

		if (thisViewer.toolbarVisible === null) { thisViewer.toolbarVisible = parseInt(Z.Utils.getResource('DEFAULT_TOOLBARVISIBLE'), 10); }
		if (thisViewer.toolbarBackgroundVisible === null) { thisViewer.toolbarBackgroundVisible = (Z.Utils.getResource('DEFAULT_TOOLBARBACKGROUNDVISIBLE') != '0'); }
		if (thisViewer.toolbarAutoShowHide === null) { thisViewer.toolbarAutoShowHide = (thisViewer.toolbarVisible != 0 && thisViewer.toolbarVisible != 1 && thisViewer.toolbarVisible != 6 && thisViewer.toolbarVisible != 7 && thisViewer.toolbarVisible != 8); }
		if (thisViewer.toolbarPosition === null) { thisViewer.toolbarPosition = parseFloat(Z.Utils.getResource('DEFAULT_TOOLBARPOSITION')); }
		if (thisViewer.logoVisible === null) { thisViewer.logoVisible = (Z.Utils.getResource('DEFAULT_LOGOVISIBLE') != '0'); }
		if (thisViewer.logoCustomPath === null) { thisViewer.logoCustomPath = Z.Utils.getResource('DEFAULT_LOGOCUSTOMPATH'); }
		if (thisViewer.minimizeVisible === null) { thisViewer.minimizeVisible = (Z.Utils.getResource('DEFAULT_MINIMIZEVISIBLE') != '0'); }
		if (thisViewer.sliderZoomVisible === null) { thisViewer.sliderZoomVisible = (Z.Utils.getResource('DEFAULT_SLIDERZOOMVISIBLE') != '0'); }
		if (thisViewer.mouseWheel === null) { thisViewer.mouseWheel = parseInt(Z.Utils.getResource('DEFAULT_MOUSEWHEEL'), 10); }

		if (thisViewer.zoomButtonsVisible === null) { thisViewer.zoomButtonsVisible = (Z.Utils.getResource('DEFAULT_ZOOMBUTTONSVISIBLE') != '0'); }
		if (thisViewer.panButtonsVisible === null) { thisViewer.panButtonsVisible = (Z.Utils.getResource('DEFAULT_PANBUTTONSVISIBLE') != '0'); }
		if (thisViewer.resetVisible === null) { thisViewer.resetVisible = (Z.Utils.getResource('DEFAULT_RESETVISIBLE') != '0'); }
		if (thisViewer.tooltipsVisible === null) { thisViewer.tooltipsVisible = (Z.Utils.getResource('DEFAULT_TOOLTIPSVISIBLE') != '0'); }
		if (thisViewer.helpVisible === null) { thisViewer.helpVisible = parseInt(Z.Utils.getResource('DEFAULT_HELPVISIBLE'), 10); }
		if (thisViewer.helpW === null) { thisViewer.helpW = parseInt(Z.Utils.getResource('UI_HELPDISPLAYWIDTH'), 10); }
		if (thisViewer.helpH === null) { thisViewer.helpH = parseInt(Z.Utils.getResource('UI_HELPDISPLAYHEIGHT'), 10); }

		if (thisViewer.progressVisible === null) { thisViewer.progressVisible = (Z.Utils.getResource('DEFAULT_PROGRESSVISIBLE') != '0'); }
		if (thisViewer.messagesVisible === null) { thisViewer.messagesVisible = (Z.Utils.getResource('DEFAULT_MESSAGESVISIBLE') != '0'); }

		if (thisViewer.fullViewVisible === null) { thisViewer.fullViewVisible = (Z.Utils.getResource('DEFAULT_FULLVIEWVISIBLE') != '0'); }
		if (thisViewer.fullScreenVisible === null) { thisViewer.fullScreenVisible  = (Z.Utils.getResource('DEFAULT_FULLSCREENVISIBLE') != '0'); }
		if (thisViewer.fullPageVisible === null) { thisViewer.fullPageVisible = (Z.Utils.getResource('DEFAULT_FULLPAGEVISIBLE') != '0'); }
		if (thisViewer.initialFullPage === null) { thisViewer.initialFullPage = (Z.Utils.getResource('DEFAULT_INITIALFULLPAGE') != '0'); }

		if (thisViewer.bookmarksGet === null) { thisViewer.bookmarksGet = (Z.Utils.getResource('DEFAULT_BOOKMARKSGET') != '0'); }
		if (thisViewer.bookmarksSet === null) { thisViewer.bookmarksSet = (Z.Utils.getResource('DEFAULT_BOOKMARKSSET') != '0'); }

		if (thisViewer.measureVisible !== true) {
			var paramsPresent = (typeof thisViewer.parameters !== 'undefined' && thisViewer.parameters !== null);
			var measureDisabled = (paramsPresent && typeof thisViewer.parameters.zMeasureVisible !== 'undefined' && thisViewer.parameters.zMeasureVisible == '0');
			var markupMode= (paramsPresent && typeof thisViewer.parameters.zMarkupMode !== 'undefined' && (thisViewer.parameters.zMarkupMode == '1' || thisViewer.parameters.zMarkupMode == '2'));
			var editMode = (paramsPresent && typeof thisViewer.parameters.zEditMode !== 'undefined' && (thisViewer.parameters.zEditMode == '1' || thisViewer.parameters.zEditMode == '2'));
			thisViewer.measureVisible = (measureDisabled) ? false
				: (markupMode || editMode) ? (Z.Utils.getResource('DEFAULT_MEASUREVISIBLEMARKUPOREDIT') != '0')
				: (Z.Utils.getResource('DEFAULT_MEASUREVISIBLE') != '0');			
		}
		
		if (thisViewer.rotationVisible === null) { thisViewer.rotationVisible = (Z.Utils.getResource('DEFAULT_ROTATIONVISIBLE') != '0'); }
		if (thisViewer.rotationFree === null) { thisViewer.rotationFree = (Z.Utils.getResource('DEFAULT_ROTATIONFREE') != '0'); }
		if (thisViewer.initialR === null) { thisViewer.initialR = Z.Utils.getResource('DEFAULT_INITIALR'); }

		if (thisViewer.screensaverSpeed === null && !isNaN(parseFloat(Z.Utils.getResource('DEFAULT_SCREENSAVERSPEED')))) { thisViewer.screensaverSpeed = parseFloat(Z.Utils.getResource('DEFAULT_SCREENSAVERSPEED')); }

		if (thisViewer.maskScale === null && !isNaN(parseFloat(Z.Utils.getResource('DEFAULT_MASKSCALE')))) { thisViewer.maskScale = parseFloat(Z.Utils.getResource('DEFAULT_MASKSCALE')); }
		if (thisViewer.maskFadeSpeed === null && !isNaN(parseFloat(Z.Utils.getResource('DEFAULT_MASKFADESPEED')))) { thisViewer.maskFadeSpeed = parseFloat(Z.Utils.getResource('DEFAULT_MASKFADESPEED')); }
		if (thisViewer.maskClearOnUserAction === null) { thisViewer.maskClearOnUserAction = (Z.Utils.getResource('DEFAULT_MASKCLEARONUSERACTION') != '0'); }

		if (thisViewer.units === null) { thisViewer.units = Z.Utils.getResource('DEFAULT_UNITS'); }
		if (thisViewer.sourceMagnification === null) { thisViewer.sourceMagnification = parseInt(Z.Utils.getResource('DEFAULT_SOURCEMAGNIFICATION'), 10); }

		if (thisViewer.virtualPointerVisible === null) { thisViewer.virtualPointerVisible = (Z.Utils.getResource('DEFAULT_VIRTUALPOINTERVISIBLE') != '0'); }
		if (thisViewer.crosshairsVisible === null) { thisViewer.crosshairsVisible = (Z.Utils.getResource('DEFAULT_CROSSHAIRSVISIBLE') != '0'); }
		
		if (thisViewer.zoomRectangle === null) { thisViewer.zoomRectangle = false; }
				
		if (thisViewer.rulerVisible === null) { thisViewer.rulerVisible = parseInt(Z.Utils.getResource('DEFAULT_RULERVISIBLE'), 10); }
		if (thisViewer.rulerListType === null) { thisViewer.rulerListType = Z.Utils.getResource('DEFAULT_RULERLISTTYPE'); }
		if (thisViewer.rulerW === null) { thisViewer.rulerW = parseInt(Z.Utils.getResource('DEFAULT_RULERWIDTH'), 10); }
		if (thisViewer.rulerH === null) { thisViewer.rulerH = parseInt(Z.Utils.getResource('DEFAULT_RULERHEIGHT'), 10); }
		if (thisViewer.rulerL === null) { thisViewer.rulerL = parseInt(Z.Utils.getResource('DEFAULT_RULERLEFT'), 10); }
		if (thisViewer.rulerT === null) { thisViewer.rulerT = parseInt(Z.Utils.getResource('DEFAULT_RULERTOP'), 10); }

		if (!isNaN(parseFloat(Z.Utils.getResource('DEFAULT_SLIDETRANSITIONSPEED')))) { thisViewer.slideTransitionSpeed = parseFloat(Z.Utils.getResource('DEFAULT_SLIDETRANSITIONSPEED')); }

		if (thisViewer.coordinatesVisible === null) { thisViewer.coordinatesVisible = (Z.Utils.getResource('DEFAULT_COORDINATESVISIBLE') != '0'); }

		if (thisViewer.geoCoordinatesVisible === null) { thisViewer.geoCoordinatesVisible = (Z.Utils.getResource('DEFAULT_GEOCOORDINATESVISIBLE') != '0'); }

		if (thisViewer.preloadVisible === null) { thisViewer.preloadVisible = (Z.Utils.getResource('DEFAULT_PRELOADVISIBLE') != '0'); }

		if (thisViewer.saveImageFull === null) { thisViewer.saveImageFull = (Z.Utils.getResource('DEFAULT_SAVEIMAGEFULL') != '0'); }
		if (thisViewer.saveImageFilename === null) { thisViewer.saveImageFilename = Z.Utils.getResource('DEFAULT_SAVEIMAGEFILENAME'); }
		if (thisViewer.saveImageFormat === null) { thisViewer.saveImageFormat = Z.Utils.getResource('DEFAULT_SAVEIMAGEFORMAT'); }
		if (thisViewer.saveImageCompression === null) { thisViewer.saveImageCompression = parseFloat(Z.Utils.getResource('DEFAULT_SAVEIMAGECOMPRESSION')); }

		var dB, dbS, dbsBGC, pageContainer, pcS, pcsBGC;
		dB = document.body;
		if (dB) {
			dbS = document.body.style;
			dbsBGC = dbS.backgroundColor
		}
		pageContainer = Z.Utils.getElementOfViewerById(zvIntID, thisViewer.pageContainerID);
		if (pageContainer) {
			pcS = Z.Utils.getElementStyle(pageContainer);
			pcsBGC = pcS.backgroundColor
		}

		if (thisViewer.imageFilters === null) { thisViewer.imageFilters = (Z.Utils.getResource('DEFAULT_IMAGEFILTERS') != '0'); }
		if (thisViewer.initialImageFilters === null) { thisViewer.initialImageFilters = (Z.Utils.getResource('DEFAULT_INITIALMAGEFILTERS') != '0'); }
		if (thisViewer.brightnessVisible === null) { thisViewer.brightnessVisible = (Z.Utils.getResource('DEFAULT_BRIGHTNESSVISIBLE') != '0'); }
		if (thisViewer.contrastVisible === null) { thisViewer.contrastVisible = (Z.Utils.getResource('DEFAULT_CONTRASTVISIBLE') != '0'); }
		if (thisViewer.sharpnessVisible === null) { thisViewer.sharpnessVisible = (Z.Utils.getResource('DEFAULT_SHARPNESSVISIBLE') != '0'); }
		if (thisViewer.blurrinessVisible === null) { thisViewer.blurrinessVisible = (Z.Utils.getResource('DEFAULT_BLURRINESSVISIBLE') != '0'); }
		if (thisViewer.colorRedVisible === null) { thisViewer.colorRedVisible = (Z.Utils.getResource('DEFAULT_COLORREDVISIBLE') != '0'); }
		if (thisViewer.colorGreenVisible === null) { thisViewer.colorGreenVisible = (Z.Utils.getResource('DEFAULT_COLORGREENVISIBLE') != '0'); }
		if (thisViewer.colorBlueVisible === null) { thisViewer.colorBlueVisible = (Z.Utils.getResource('DEFAULT_COLORBLUEVISIBLE') != '0'); }
		if (thisViewer.colorRedRangeVisible === null) { thisViewer.colorRedRangeVisible = (Z.Utils.getResource('DEFAULT_COLORREDRANGEVISIBLE') != '0'); }
		if (thisViewer.colorGreenRangeVisible === null) { thisViewer.colorGreenRangeVisible = (Z.Utils.getResource('DEFAULT_COLORGREENRANGEVISIBLE') != '0'); }
		if (thisViewer.colorBlueRangeVisible === null) { thisViewer.colorBlueRangeVisible = (Z.Utils.getResource('DEFAULT_COLORBLUERANGEVISIBLE') != '0'); }
		if (thisViewer.gammaVisible === null) { thisViewer.gammaVisible = (Z.Utils.getResource('DEFAULT_GAMMAVISIBLE') != '0'); }
		if (thisViewer.gammaRedVisible === null) { thisViewer.gammaRedVisible = (Z.Utils.getResource('DEFAULT_GAMMAREDVISIBLE') != '0'); }
		if (thisViewer.gammaGreenVisible === null) { thisViewer.gammaGreenVisible = (Z.Utils.getResource('DEFAULT_GAMMAGREENVISIBLE') != '0'); }
		if (thisViewer.gammaBlueVisible === null) { thisViewer.gammaBlueVisible = (Z.Utils.getResource('DEFAULT_GAMMABLUEVISIBLE') != '0'); }
		if (thisViewer.hueVisible === null) { thisViewer.hueVisible = (Z.Utils.getResource('DEFAULT_HUEVISIBLE') != '0'); }
		if (thisViewer.saturationVisible === null) { thisViewer.saturationVisible = (Z.Utils.getResource('DEFAULT_SATURATIONVISIBLE') != '0'); }
		if (thisViewer.lightnessVisible === null) { thisViewer.lightnessVisible = (Z.Utils.getResource('DEFAULT_LIGHTNESSVISIBLE') != '0'); }
		if (thisViewer.whiteBalanceVisible === null) { thisViewer.whiteBalanceVisible = (Z.Utils.getResource('DEFAULT_WHITEBALANCEVISIBLE') != '0'); }
		if (thisViewer.normalizeVisible === null) { thisViewer.normalizeVisible = (Z.Utils.getResource('DEFAULT_NORMALIZEVISIBLE') != '0'); }
		if (thisViewer.equalizeVisible === null) { thisViewer.equalizeVisible = (Z.Utils.getResource('DEFAULT_EQUALIZEVISIBLE') != '0'); }
		if (thisViewer.noiseVisible === null) { thisViewer.noiseVisible = (Z.Utils.getResource('DEFAULT_NOISEVISIBLE') != '0'); }
		if (thisViewer.grayscaleVisible === null) { thisViewer.grayscaleVisible = (Z.Utils.getResource('DEFAULT_GRAYSCALEVISIBLE') != '0'); }
		if (thisViewer.thresholdVisible === null) { thisViewer.thresholdVisible = (Z.Utils.getResource('DEFAULT_THRESHOLDVISIBLE') != '0'); }
		if (thisViewer.inversionVisible === null) { thisViewer.inversionVisible = (Z.Utils.getResource('DEFAULT_INVERSIONVISIBLE') != '0'); }
		if (thisViewer.edgesVisible === null) { thisViewer.edgesVisible = (Z.Utils.getResource('DEFAULT_EDGESVISIBLE') != '0'); }
		if (thisViewer.sepiaVisible === null) { thisViewer.sepiaVisible = (Z.Utils.getResource('DEFAULT_SEPIAVISIBLE') != '0'); }
		
		if (thisViewer.freehandVisible === null) { thisViewer.freehandVisible = (Z.Utils.getResource('DEFAULT_FREEHANDVISIBLE') != '0'); }
		if (thisViewer.textVisible === null) { thisViewer.textVisible = (Z.Utils.getResource('DEFAULT_TEXTVISIBLE') != '0'); }
		if (thisViewer.iconVisible === null) { thisViewer.iconVisible = (Z.Utils.getResource('DEFAULT_ICONVISIBLE') != '0'); }
		if (thisViewer.rectangleVisible === null) { thisViewer.rectangleVisible = (Z.Utils.getResource('DEFAULT_RECTANGLEVISIBLE') != '0'); }
		if (thisViewer.polygonVisible === null) { thisViewer.polygonVisible = (Z.Utils.getResource('DEFAULT_POLYGONVISIBLE') != '0'); }
		if (thisViewer.annotationPanelVisible === null) { thisViewer.annotationPanelVisible = parseInt(Z.Utils.getResource('DEFAULT_ANNOTATIONPANELVISIBLE'), 10); }
		if (thisViewer.labelIconsInternal === null) { thisViewer.labelIconsInternal = (Z.Utils.getResource('DEFAULT_LABELICONSINTERNAL') != '0'); }
		if (thisViewer.annotationsAddMultiple === null) { thisViewer.annotationsAddMultiple = (Z.Utils.getResource('DEFAULT_ANNOTATIONSADDMULTIPLE') != '0'); }
		if (thisViewer.annotationsAutoSave === null) { thisViewer.annotationsAutoSave = (Z.Utils.getResource('DEFAULT_ANNOTATIONSAUTOSAVE') != '0'); }
		if (thisViewer.annotationsAutoSaveImage === null) { thisViewer.annotationsAutoSaveImage = (Z.Utils.getResource('DEFAULT_ANNOTATIONSAUTOSAVEIMAGE') != '0'); }
		if (thisViewer.saveButtonVisible === null) { thisViewer.saveButtonVisible = (Z.Utils.getResource('DEFAULT_ANNOTATIONSAVEBUTTONVISIBLE') != '0'); }
		if (thisViewer.labelClickSelect === null) { thisViewer.labelClickSelect = (Z.Utils.getResource('DEFAULT_LABELCLICKSELECT') != '0'); }
				
		if (thisViewer.userPanelVisible === null) { thisViewer.userPanelVisible = Z.Utils.getResource('DEFAULT_USERPANELVISIBLE'); }
		if (thisViewer.userNamePrompt === null) { thisViewer.userNamePrompt = Z.Utils.getResource('UI_USERNAMEPROMPT'); }
		if (thisViewer.userNamePromptRetry === null) { thisViewer.userNamePromptRetry = Z.Utils.getResource('UI_USERNAMEPROMPTRETRY'); }
		
		if (thisViewer.trackingPanelVisible === null) { thisViewer.trackingPanelVisible = parseInt(Z.Utils.getResource('DEFAULT_TRACKINGPANELVISIBLE'), 10); }
		if (thisViewer.initialTrackingOverlayVisible === null) { thisViewer.initialTrackingOverlayVisible = parseInt(Z.Utils.getResource('DEFAULT_INITIALTRACKINGOVERLAYVISIBLE'), 10); }
		
		if (thisViewer.focal === null) { thisViewer.focal = parseInt(Z.Utils.getResource('DEFAULT_FOCAL'), 10); }
		if (thisViewer.quality === null) { thisViewer.quality = parseInt(Z.Utils.getResource('DEFAULT_QUALITY'), 10); }

		if (thisViewer.saveImageBackColor === null) { thisViewer.saveImageBackColor = (Z.Utils.stringValidate(pcsBGC) && pcsBGC != 'transparent') ? pcsBGC : (Z.Utils.stringValidate(dbsBGC) && dbsBGC != 'transparent') ? dbsBGC : Z.Utils.getResource('DEFAULT_SAVEIMAGEBACKCOLOR'); }

		if (thisViewer.sliderImageSetVisible === null) { thisViewer.sliderImageSetVisible = (Z.Utils.getResource('DEFAULT_IMAGESETSLIDERVISIBLE') != '0'); }
	
		if (typeof params === 'object' && params !== null) {
			var unrecognizedParamAlert = Z.Utils.getResource('ERROR_UNRECOGNIZEDPARAMETERALERT');

			// Test for hotspot or annotation path and save handler path before allow setting of markup or annotation mode below.
			thisViewer.annotationPathProvided = (typeof params['zHotspotPath'] !== 'undefined' || typeof params['zAnnotationPath'] !== 'undefined' || typeof params['zAnnotationXMLText'] !== 'undefined' || typeof params['zAnnotationJSONObject'] !== 'undefined');
			thisViewer.saveHandlerProvided = (typeof params['zSaveHandlerPath'] !== 'undefined' || (typeof params['zNoPost'] !== 'undefined' && params['zNoPost'] == '1'));
			thisViewer.imageSetPathProvided = (typeof params['zAnimationPath'] !== 'undefined' || typeof params['zSlidestackPath'] !== 'undefined');
			thisViewer.saveImageHandlerProvided = (typeof params['zSaveImageHandlerPath'] !== 'undefined');
			thisViewer.mouseWheelParmeterProvided = (typeof params['zMouseWheel'] !== 'undefined');
			thisViewer.trackingPathProvided = (typeof params['zTrackingPath'] !== 'undefined' || typeof params['zTrackingXMLText'] !== 'undefined' || typeof params['zTrackingJSONObject'] !== 'undefined');
			thisViewer.userPathProvided = (typeof params['zUserPath'] !== 'undefined' || typeof params['zUserXMLText'] !== 'undefined' || typeof params['zUserJSONObject'] !== 'undefined');

			// Also test for slide path to enable test for impacts of Prototype.js library below.
			thisViewer.slidePathProvided = ((thisViewer.imagePath && thisViewer.imagePath.indexOf('zSlidePath') != -1) || typeof params['zSlidePath'] !== 'undefined');
			var specialHandlingForPrototypeLib = (thisViewer.slidePathProvided || thisViewer.comparison || thisViewer.overlays || thisViewer.slideshow || thisViewer.imageSetPathProvided || thisViewer.animation || thisViewer.slidestack);

			for (var pName in params) {

				// DEV NOTE: The Prototype.js library extends native data type prototypes and causes the for-in used to parse the optional parameters string
				// to fill the params object with extension functions that must be ignored. Exceptions added for Zoomify parameters that are functions.
				// Function test not effective when slide, animation, or slidestack path in use. Explicit name test then required.
				// String test may miss new prototype features so second condition below uses console rather than alert to avoid interruption of processing.
				if ((typeof params[pName] === 'function' && pName !== 'zOnAnnotationReady' && pName !== 'zOnReady')
					|| (specialHandlingForPrototypeLib && (pName == 'each' || pName == 'eachSlice' || pName == 'all' || pName == 'any' || pName == 'collect' || pName == 'detect' || pName == 'findAll' || pName == 'select' || pName == 'grep' || pName == 'include' || pName == 'member' || pName == 'inGroupsOf' || pName == 'inject' || pName == 'invoke' || pName == 'max' || pName == 'min' || pName == 'partition' || pName == 'pluck' || pName == 'reject' || pName == 'sortBy' || pName == 'toArray' || pName == 'zip' || pName == 'size' || pName == 'inspect' || pName == '_reverse' || pName == '_each' || pName == 'clear' || pName == 'first' || pName == 'last' || pName == 'compact' || pName == 'flatten' || pName == 'without' || pName == 'uniq' || pName == 'intersect' || pName == 'clone'))
					|| (pName.indexOf('this.indexOf') != -1)) {
						continue;

				} else if ((typeof thisViewer[Z.Utils.stringLowerCaseFirstLetter(pName.substr(1))] === 'undefined')
					&& (typeof Z[Z.Utils.stringLowerCaseFirstLetter(pName.substr(1))] === 'undefined')) {
					if (specialHandlingForPrototypeLib) {
						console.log(unrecognizedParamAlert + ' ' +pName);
					} else {
						alert(unrecognizedParamAlert + ' ' +pName);
					}

				} else {

					pValue = params[pName];

					// For limited feature edition, disable Express, Pro, and Enterprise parameters.
					// Then only one is supported, zNavigatorVisible, and Z logo link is enabled.
					if (!thisViewer.expressParamsEnabled && pName != 'zNavigatorVisible') {
						alert(expressParamsDisabledAlert + ' ' +pName);

					} else {
						switch (pName) {
						
							case 'zViewerID' : // Support multiple Viewer instances in one web page.
								thisViewer.viewerID = pValue;
								break;

							case 'zOnAnnotationReady' : // Callback function option for completion of Annotation Panel initialization.
								if (typeof pValue === 'function') {
									thisViewer.setCallback('annotationPanelInitializedViewer', pValue);
								}
								break;
							case 'zOnReady' : // Callback function option for completion of Viewer initialization.
								if (typeof pValue === 'function') {
									thisViewer.setCallback('readyViewer', pValue);
								}
								break;

							case 'zInitialX' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { thisViewer.initialX = parseFloat(pValue); }
								break;
							case 'zInitialY' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { thisViewer.initialY = parseFloat(pValue); }
								break;
							case 'zInitialZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }
								if (!isNaN(parseFloat(pValue))) {
									thisViewer.initialZ = parseFloat(pValue);
									if (thisViewer.initialZ && thisViewer.initialZ > 0 && thisViewer.initialZ <= 100) { thisViewer.initialZ /= 100; }
								}
								break;
							case 'zMinZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }
								if (!isNaN(parseFloat(pValue))) {
									thisViewer.minZ = parseFloat(pValue);
									if (thisViewer.minZ && thisViewer.minZ > 0 && thisViewer.minZ <= 100) { thisViewer.minZ /= 100; }
								}
								break;
							case 'zMaxZoom' : // '1' to '100' recommended range (internally 0.1 to 1), default is 1 (100%).
								if (!isNaN(parseFloat(pValue))) {
									thisViewer.maxZ = parseFloat(pValue);
									if (thisViewer.maxZ && thisViewer.maxZ != -1) { thisViewer.maxZ /= 100; }
								}
								break;

							case 'zNavigatorVisible' :  // '0'=hide, '1'=show, '2'= initially show then hide on mouse-out (default), '3'=initially hide then show when mouse over.
								thisViewer.navigatorVisible = parseInt(pValue, 10);
								break;
							case 'zNavigatorRectangleColor' :  // Valid web color, '#' character permitted but not required.
								thisViewer.navigatorRectangleColor = pValue;
								break;

							case 'zToolbarInternal' :  // '0'=false (default), '1'=true, substitutes simple canvas-drawn toolbar with no need for external skin graphics files in Assets folder.
								thisViewer.toolbarInternal = pValue;
								break;
							case 'zToolbarVisible' :  // '0'=hide, '1'=show, '2'= initially show then hide on mouse-out (default), '3'=initially hide then show when mouse over, '4' and '5'=same as '2' and '3' but minimize rather than hiding, '6' and '7'= same as '1' and '2' but minimize buttons still visible (and toolbar overlaps display), '8' hides toolbar and keeps it hidden (supports external toolbar with editing functions fully enabled). On mobile devices behavior is forced from '2' and '3' to '4' and '5'.
								thisViewer.toolbarVisible = parseInt(pValue, 10);
								thisViewer.toolbarAutoShowHide = (thisViewer.toolbarVisible != 0 && thisViewer.toolbarVisible != 1 && thisViewer.toolbarVisible != 6 && thisViewer.toolbarVisible != 7 && thisViewer.toolbarVisible != 8);
								break;
							case 'zToolbarBackgroundVisible' :  // '0'=hide (default), '1'=show.
								if (pValue == '0') { thisViewer.toolbarBackgroundVisible = false; }
								break;
							case 'zLogoVisible' :  // '0'=hide, '1'=show (default).
								if (pValue == '0') { thisViewer.logoVisible = false; }
								break;
							case 'zMinimizeVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { thisViewer.minimizeVisible = false; }
								break;
							case 'zSliderVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { thisViewer.sliderZoomVisible = false; }
								break;
							case 'zZoomButtonsVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { thisViewer.zoomButtonsVisible = false; }
								break;
							case 'zPanButtonsVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { thisViewer.panButtonsVisible = false; }
								break;
							case 'zResetVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { thisViewer.resetVisible = false; }
								break;

							case 'zFullViewVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '1') {
									thisViewer.fullScreenVisible = true;
									thisViewer.fullPageVisible = false;
								} else if (pValue == '0') {
									thisViewer.fullScreenVisible = false;
									thisViewer.fullPageVisible = false;
								}
								break;
							case 'zFullScreenVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') {
									thisViewer.fullScreenVisible = false;
									thisViewer.fullPageVisible = false;
								}
								break;
							case 'zFullPageVisible' :  // '0'=false (default), '1'=true.
								if (pValue == '1') {
									thisViewer.fullScreenVisible = false;
									thisViewer.fullPageVisible = true;
								}
								break;
							case 'zInitialFullPage' :  // '0'=false (default), '1'=true.
								if (pValue == '1') { thisViewer.initialFullPage = true; }
								break;
							case 'zFullPageInitial' :  // Deprecated. Replaced with the above for consistency.
								alert(Z.Utils.getResource('ERROR_PARAMETERDEPRECATED') + ' zFullPageInitial is now zInitialFullPage');
								break;

							case 'zSkinPath' :
								thisViewer.skinPath = pValue;
								break;
							case 'zTooltipsVisible' :  // '0'=hide, '1'=show (default).
								if (pValue == '0') { thisViewer.tooltipsVisible = false; }
								break;

							case 'zHelpVisible' :  // '0'=hide, '1'=show (default), '2'=hide toolbar help, show annotation & markup help, '3'=reverse.
								thisViewer.helpVisible = parseInt(pValue, 10);
								break;
							case 'zHelpPath' :
								thisViewer.helpPath = pValue;
								thisViewer.helpCustom = true;
								break;
							case 'zHelpWidth' : // Size in pixels, default is 430.
								if (!isNaN(parseInt(pValue, 10))) { thisViewer.helpW = parseInt(pValue, 10); }
								break;
							case 'zHelpHeight' : // Size in pixels, default is 300.
								if (!isNaN(parseInt(pValue, 10))) { thisViewer.helpH = parseInt(pValue, 10); }
								break;
							case 'zHelpLeft' : // Position in pixels, default is centered horizontally in display.
								if (!isNaN(parseInt(pValue, 10))) { thisViewer.helpL = parseInt(pValue, 10); }
								break;
							case 'zHelpTop' : // Position in pixels, default is centered vertically in display.
								if (!isNaN(parseInt(pValue, 10))) { thisViewer.helpT = parseInt(pValue, 10); }
								break;

							case 'zProgressVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { thisViewer.progressVisible = false; }
								break;
							case 'zMessagesVisible' :  // '0'=hide, '1'=show (default).
								if (pValue == '0') { thisViewer.messagesVisible = false; }
								break;
								
							case 'zTileSource' : 
								if (pValue.toLowerCase() == 'dzi') { thisViewer.tileSource = 'DZIFolder'; }
								break;

							default :
								if (!thisViewer.proParamsEnabled) {
									alert(proParamsDisabledAlert + ' ' +pName);
								} else {
									switch (pName) {
										case 'zXMLParametersPath' : // Meta-parameter substitutes XML parameter file for HTML parameters.
											// Substitute zXMLParametersPath for image path parameter, include image path in parameters XML file and exclude 3rd optional parameter.
											thisViewer.xmlParametersPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											thisViewer.loadParametersXML();
											break;

										case 'zZoomSpeed' : // '1'=slow to '10'=fast, default is '5'.
											thisViewer.zoomSpeed = parseInt(pValue, 10);
											break;
										case 'zPanSpeed' :  // '1'=slow to '10'=fast, default is '5'.
											thisViewer.panSpeed = parseInt(pValue, 10);
											break;
										case 'zFadeInSpeed' : // '1'=slow to '10'=fast, default is '5', '0' = no fade-in.
											thisViewer.fadeInSpeed = parseInt(pValue, 10);
											thisViewer.fadeIn = (thisViewer.fadeInSpeed > 0 && !thisViewer.imageFilters); // Disable fade-in if filters available for use, to optimize performace.
											break;

										case 'zInteractive' :  // '0'=disable, '1'=enable (default).
											if (pValue == '0') {
												thisViewer.interactive = false;
												thisViewer.navigatorVisible = false;
												thisViewer.toolbarVisible = 0;
												thisViewer.clickZoom = false;
												thisViewer.doubleClickZoom = false;
												thisViewer.clickPan = false;
												thisViewer.mousePan = false;
												thisViewer.keys = false;
											}
											break;
										case 'zClickZoom' :  // '0'=disable, '1'=enable (default).
											if (pValue == '0') { thisViewer.clickZoom = false; }
											break;
										case 'zDoubleClickZoom' :  // '0'=disable, '1'=enable (default).
											if (pValue == '0') { thisViewer.doubleClickZoom = false; }
											break;
										case 'zDoubleClickDelay' : // '600'=slow to '200'=fast, default is '350'.
											thisViewer.doubleClickDelay = parseInt(pValue, 10);
											break;
										case 'zClickPan' :  // '0'=disable, '1'=enable (default).
											if (pValue == '0') { thisViewer.clickPan = false; }
											break;
										case 'zMousePan' :  // '0'=disable, '1'=enable (default).
											if (pValue == '0') { thisViewer.mousePan = false; }
											break;
										case 'zKeys' :  // '0'=disable, '1'=enable (default).
											if (pValue == '0') { thisViewer.keys = false; }
											break;

										case 'zConstrainPan' :  // '0'=false, '1'=loose (constrain image center to viewport edge), '2'=relaxed (default, constrain trailing edge to viewport center), '3'=strict (constrain trailing edge of image to far edge of display and center image when zoomed-out).
											thisViewer.constrainPan = (pValue != '0');
											thisViewer.constrainPanLimit = parseInt(pValue, 10);
											thisViewer.constrainPanStrict = (pValue == '3');
											break;
										case 'zPanBuffer' :  // '1'=none, '1.5' (default), '2'=double, '3'=impractical. Does not affect mobile value (always 1, none). Will not override canvasSizeMax based on limit for image sets, limit for Firefox due to unconverted image use, or general browser limit.
											var panBuffTest = parseFloat(pValue);
											if (!isNaN(panBuffTest)) { thisViewer.panBuffer = panBuffTest; }
											break;

										case 'zSmoothPan' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { thisViewer.smoothPan = false; }
											break;
										case 'zSmoothPanEasing' : // '1'=direct, '2'=fluid (default), '3'=gentle, '4'=relaxed, '5'=loose;
											var easingValue = parseInt(pValue, 10);
											if (easingValue >= 1 && easingValue <= 5) { thisViewer.smoothPanEasing = easingValue; }
											break;
										case 'zSmoothPanGlide' : // '1'=none, '2'=fluid (default), '3'=gentle, '4'=relaxed, '5'=loose;
											var glideValue = parseInt(pValue, 10);
											if (glideValue >= 1 && glideValue <= 5) { thisViewer.smoothPanGlide = glideValue; }
											break;
										case 'zSmoothZoom' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { thisViewer.smoothZoom = false; }
											break;
										case 'zSmoothZoomEasing' : // '1'=direct, '2'=fluid (default), '3'=gentle, '4'=relaxed;
											var easingValue = parseInt(pValue, 10);
											if (easingValue >= 1 && easingValue <= 4) { thisViewer.smoothZoomEasing = easingValue; }
											break;

										case 'zAutoResize' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { thisViewer.autoResize = true; }
											break;

										case 'zCanvas' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { thisViewer.canvas = false; }
											// Use canvas if supported by browser and not disabled by parameter.
											if (!thisViewer.canvasSupported || !thisViewer.canvas) { thisViewer.useCanvas = false; }
											break;
										case 'zBaseZIndex' :  // '2000' default, range -2147483648 to +2147483647. Locate affected Viewer elements by searching for variable thisViewer.baseZIndex.
											thisViewer.baseZIndex = parseInt(pValue, 10);
											break;
										case 'zDebug' :  // '0'=disable (default), '1'=enable debug panel (fast), '2'=enable debug panel, tile loading calculations, tile name displays, tile tracing (slow), 3=enable debug panel, tile loading calculations, no tracing, no tile names (medium), '4'=enable tile names only (fast).
											thisViewer.debug = parseInt(pValue, 10);
											break;

										case 'zImageProperties' :
											thisViewer.imageProperties = pValue;
											break;

										case 'zNavigatorWidth' : // Size in pixels, default is 150, useful max is thumbnail width.
											if (!isNaN(parseInt(pValue, 10))) {
												thisViewer.navigatorW = parseInt(pValue, 10);
												if (thisViewer.rulerVisible > 0 && thisViewer.rulerW === null || thisViewer.rulerW == -1) { thisViewer.rulerW = thisViewer.navigatorW; }
											}
											break;
										case 'zNavigatorHeight' : // Size in pixels, default is 100, useful max is thumbnail height.
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.navigatorH = parseInt(pValue, 10); }
											break;
										case 'zNavigatorLeft' : // Position in pixels, default is -1 (0 after calculation).
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.navigatorL = parseInt(pValue, 10); }
											break;
										case 'zNavigatorTop' : // Position in pixels, default is 0.
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.navigatorT = parseInt(pValue, 10); }
											break;
										case 'zNavigatorFit' :  // '0'= fit to viewer (default), '1'= fit to image.
											if (!isNaN(parseFloat(pValue))) { thisViewer.navigatorFit = parseInt(pValue, 10); }
											break;

										case 'zGalleryVisible' :  // '0'=hide (default if not slideshow or image set), '1'=show, '2'= initially show then hide on mouse-out (default if slideshow).
											thisViewer.galleryVisible = parseInt(pValue, 10);
											thisViewer.galleryAutoShowHide = (thisViewer.galleryVisible == 2);
											break;
										case 'zGalleryWidth' : // Size in pixels, default is 150, useful max is thumbnail width.
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.galleryW = parseInt(pValue, 10); }
											break;
										case 'zGalleryHeight' : // Size in pixels, default is 100, useful max is thumbnail height.
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.galleryH = parseInt(pValue, 10); }
											break;
										case 'zGalleryLeft' : // Position in pixels, default is -1 (0 after calculation).
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.galleryL = parseInt(pValue, 10); }
											break;
										case 'zGalleryTop' : // Position in pixels, default is 0.
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.galleryT = parseInt(pValue, 10); }
											break;
										case 'zGalleryPosition' :  // '0'=top, '1'=bottom (default).
											thisViewer.galleryPosition = parseInt(pValue, 10);
											break;

										case 'zToolbarPosition' :  // '0'=top, '1'=bottom (default).
											thisViewer.toolbarPosition = parseInt(pValue, 10);
											break;
										case 'zLogoCustomPath' :
											thisViewer.logoCustomPath = pValue;
											break;
										case 'zLogoLinkURL' :
											if (Z.Utils.stringValidate(pValue)) { 
												if (pValue.indexOf('http') == -1) { pValue = 'http://' + pValue; }
												thisViewer.logoLinkURL = pValue;
											}
											break;

										case 'zBookmarksGet' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { thisViewer.bookmarksGet = true; }
											break;
										case 'zBookmarksSet' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { thisViewer.bookmarksSet = true; }
											break;

										case 'zCopyrightPath' :
											thisViewer.copyrightPath = pValue;
											break;
										case 'zWatermarkPath' :
											thisViewer.watermarkPath = pValue;
											thisViewer.watermarks = true;
											break;

										case 'zVirtualPointerVisible' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { thisViewer.virtualPointerVisible = true; }
											break;
										case 'zCrosshairsVisible' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { thisViewer.crosshairsVisible = true; }
											break;

										case 'zZoomRectangle' :  // '0'=false (default for Express edition and mobile devices), '1'=true (default for Pro and Enterprise editions).
											if (pValue == '0') { thisViewer.zoomRectangle = false; }
											break;

										case 'zRulerVisible' :  // '0'=hide, '1'=show, '2'= initially show then hide on mouse-out (default), '3'=initially hide then show when mouse over.
											thisViewer.rulerVisible = parseInt(pValue, 10);
											break;
										case 'zRulerListType' : // '0'=hide, '1'=magnifications, '2'=percents (default).
											if (Z.Utils.stringValidate(pValue)) { thisViewer.rulerListType = pValue; }
											break;
										case 'zRulerWidth' : // Size in pixels, default is 150.
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.rulerW = parseInt(pValue, 10); }
											break;
										case 'zRulerHeight' : // Size in pixels, default is 50.
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.rulerH = parseInt(pValue, 10); }
											break;
										case 'zRulerLeft' : // Position in pixels, default is 0.
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.rulerL = parseInt(pValue, 10); }
											break;
										case 'zRulerTop' : // Position in pixels, default is 0.
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.rulerT = parseInt(pValue, 10); }
											break;
										case 'zUnits' : // Supported values: 'Ym', 'Zm', 'Em', 'Pm', 'Tm', 'Gm', 'Mm', 'km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm', 'um', 'nm', 'pm', 'fm', 'am', 'zm', 'ym', 'pixels' (default).
											if (Z.Utils.stringValidate(pValue)) { thisViewer.units = pValue; }
											break;
										case 'zUnitsPerImage' :
											if (!isNaN(parseFloat(pValue))) { thisViewer.unitsPerImage = parseFloat(pValue); }
											break;
										case 'zPixelsPerUnit' :
											if (!isNaN(parseFloat(pValue))) { thisViewer.pixelsPerUnit = parseFloat(pValue); }
											break;
										case 'zSourceMagnification' :
											if (!isNaN(parseInt(pValue, 10))) { thisViewer.sourceMagnification = parseInt(pValue, 10); }
											break;
										case 'zMagnification' :  // Deprecated. Replaced with the above for clarity.
											alert(Z.Utils.getResource('ERROR_PARAMETERDEPRECATED') + ' zMagnification is now zSourceMagnification');
											break;

										case 'zMeasureVisible' :  // '0'=false (default), '1'=true.
											thisViewer.measureVisible = (pValue == '1');
											break;

										case 'zRotationVisible' :  // '0'=false (default), '1'= free rotation true, '2'= 90 degree increments true.
											if (pValue != '0') {
												thisViewer.rotationVisible = true;
												thisViewer.rotationFree = (pValue == '1');
											}
											break;
										case 'zInitialRotation' : // '90', '180', '270' supported unless thisViewer.rotationFree, other values constrained, default is '0'.
											if (!isNaN(parseFloat(pValue))) {
												thisViewer.initialR = parseInt(pValue, 10);
											}
											break;

										case 'zImageListPath' :
											thisViewer.imageListPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											thisViewer.imageList = true;
											break;

										case 'zScreensaver' :  // '0'=false (default), '1'=true.
											if (pValue == '1') {
												thisViewer.screensaver = true;
												thisViewer.tour = true;
											}
											break;
										case 'zScreensaverSpeed' : // '1'=slow to '10'=fast, default is '5', '0' = no zoom-and-pan transition.
											thisViewer.screensaverSpeed = parseInt(pValue, 10);
											break;

										case 'zTourPath' :
											thisViewer.tourPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											thisViewer.hotspotPath = thisViewer.tourPath;
											thisViewer.hotspotFolder = thisViewer.hotspotPath;
											if (thisViewer.hotspotPath.toLowerCase().substring(thisViewer.hotspotPath.length - 4, thisViewer.hotspotPath.length) == '.xml') {
												thisViewer.hotspotFolder = thisViewer.hotspotFolder.substring(0, thisViewer.hotspotFolder.lastIndexOf('/'));
											}
											thisViewer.tour = true;
											break;
										case 'zTourListTitle' :
											thisViewer.tourListTitle = pValue;
											break;

										case 'zComparisonPath' :			
											thisViewer.imageSetPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											thisViewer.imageSet = true;
											thisViewer.comparison = true;
											thisViewer.smoothPan = false; // DEV NOTE: Disabling smooth pan in comparison mode as workaround to avoid loops when sync'ing viewports during rapid pan or zoom while switching between viewports.
											break;
										case 'zSyncVisible' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { thisViewer.syncVisible = false; }
											break;
										case 'zInitialSync' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { thisViewer.initialSync = false; }
											break;

										case 'zSlidePath' :
											thisViewer.slidePath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											thisViewer.slideshow = true;
											break;
										case 'zSlideListTitle' :
											thisViewer.slideListTitle = pValue;
											break;

										case 'zHotspotPath' :
											thisViewer.hotspotPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											thisViewer.hotspotFolder = thisViewer.hotspotPath;
											if (thisViewer.hotspotPath.toLowerCase().substring(thisViewer.hotspotPath.length - 4, thisViewer.hotspotPath.length) == '.xml') {
												thisViewer.hotspotFolder = thisViewer.hotspotFolder.substring(0, thisViewer.hotspotFolder.lastIndexOf('/'));
											}
											thisViewer.hotspots = true;
											break;
										case 'zHotspotListTitle' :
											thisViewer.hotspotListTitle = pValue;
											break;
										case 'zHotspotsDrawOnlyInView' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { thisViewer.hotspotsDrawOnlyInView = false; }
											break;
										case 'zCaptionBoxes' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { thisViewer.captionBoxes = true; }
											break;
										case 'zCaptionOffset' : // Pixels between icon and caption.
											thisViewer.captionOffset = parseInt(pValue, 10);
											break;

										case 'zCaptionTextColor' :  // Valid web color, '#' character not required but permitted.
											thisViewer.captionTextColor = Z.Utils.stringValidateColorValue(pValue);
											thisViewer.captionsColorsDefault = false;
											break;
										case 'zCaptionBackColor' :  // Valid web color, '#' character not required but permitted.
											thisViewer.captionBackColor = Z.Utils.stringValidateColorValue(pValue);
											thisViewer.captionsColorsDefault = false;
											break;
										case 'zPolygonLineColor' :  // Valid web color, '#' character not required but permitted.
											thisViewer.polygonLineColor = Z.Utils.stringValidateColorValue(pValue);
											break;
										case 'zPolygonFillColor' :  // Valid web color, '#' character not required but permitted.
											thisViewer.polygonFillColor = Z.Utils.stringValidateColorValue(pValue);
											break;
										case 'zCaptionTextVisible' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { thisViewer.captionTextVisible = false; }
											break;
										case 'zCaptionBackVisible' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { thisViewer.captionBackVisible = false; }
											break;
										case 'zPolygonLineVisible' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { thisViewer.polygonLineVisible = false; }
											break;
										case 'zPolygonFillVisible' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { thisViewer.polygonFillVisible = true; }
											break;

										case 'zCoordinatesVisible' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { thisViewer.coordinatesVisible = true; }
											break;

										case 'zGeoCoordinatesPath' :
											thisViewer.geoCoordinatesPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											thisViewer.geoCoordinatesFolder = thisViewer.geoCoordinatesPath;
											if (thisViewer.geoCoordinatesPath.toLowerCase().substring(thisViewer.geoCoordinatesPath.length - 4, thisViewer.geoCoordinatesPath.length) == '.xml') {
												thisViewer.geoCoordinatesFolder = thisViewer.geoCoordinatesFolder.substring(0, thisViewer.geoCoordinatesFolder.lastIndexOf('/'));
											}
											thisViewer.geoCoordinatesVisible = true;
											thisViewer.coordinatesVisible = true;
											break;

										case 'zPreloadVisible' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { thisViewer.preloadVisible = true; }
											break;

										case 'zOverlayPath' :
											thisViewer.imageSetPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											thisViewer.imageSet = true;
											thisViewer.overlays = true;
											break;
										case 'zOverlayJSONObject' :
											thisViewer.overlayJSONObject = pValue;
											thisViewer.imageSet = true;
											thisViewer.overlays = true;
											break;

										case 'zAnimationPath' :
											thisViewer.imageSetPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
											thisViewer.imageSet = true;
											thisViewer.animation = true;
											if (!thisViewer.mouseWheelParmeterProvided) {
												thisViewer.mouseWheel = parseInt(Z.Utils.getResource('DEFAULT_MOUSEWHEELANIMATION'), 10);
												thisViewer.sliderFocus = (thisViewer.mouseWheel == 2) ? 'imageSet' : 'zoom';
											}
											if (!thisViewer.constrainPanStrict) { thisViewer.constrainPanStrict = true; }
											break;
										case 'zAnimationAxis' : // Supported values: 'horizontal' (default), 'vertical'.
											thisViewer.animationAxis = (Z.Utils.stringValidate(pValue) && pValue == 'vertical') ? 'vertical' : 'horizontal';
											break;
										case 'zAnimator' : // Supported values: 'motion' (default), 'position'.
											thisViewer.animator = (Z.Utils.stringValidate(pValue) && pValue == 'motion') ? 'motion' : 'position';
											break;
										case 'zAnimationFlip' :  // '0'=false (default), '1'=true.
											if (pValue == '1') { thisViewer.animationFlip = true; }
											break;

										case 'zImageSetSliderVisible' :  // '0'=false, '1'=true (default).
											if (pValue == '0') { thisViewer.sliderImageSetVisible = false; }
											break;

										case 'zMouseWheel' : // '0'=disabled, '1'=zoom priority (default), '2'=image set priority.
											thisViewer.mouseWheel = parseInt(pValue, 10);
											thisViewer.sliderFocus = (thisViewer.mouseWheel == 2) ? 'imageSet' : 'zoom';
											break;

										case 'zTilesPNG' :   // '0'=false (default, jpeg), '1'=true.
											if (pValue == '1') { thisViewer.tileType = 'png'; }
											break;
										case 'zTileW' :
											thisViewer.tileW = parseInt(pValue, 10);
											break;
										case 'zTileH' :
											thisViewer.tileH = parseInt(pValue, 10);
											break;

										default :
											if (!thisViewer.enterpriseParamsEnabled) {
												alert(enterpriseParamsDisabledAlert + ' ' +pName);
											} else {
												switch (pName) {

													case 'zImageFiltersVisible' :  // '0'=false (default), '1'=true=all, other supported options: 'all', 'creative', 'hsl', 'pathology', 'colors', 'ranges', 'gammaColors', 'external'.
														if (Z.Utils.stringValidate(pValue)) {
															switch(pValue) {
																case 'all' :
																	thisViewer.brightnessVisible = true;
																	thisViewer.contrastVisible = true;
																	thisViewer.sharpnessVisible = true;
																	thisViewer.blurrinessVisible = true;
																	thisViewer.colorRedVisible = true;
																	thisViewer.colorGreenVisible = true;
																	thisViewer.colorBlueVisible = true;
																	thisViewer.colorRedRangeVisible = true;
																	thisViewer.colorGreenRangeVisible = true;
																	thisViewer.colorBlueRangeVisible = true;
																	thisViewer.gammaVisible = true;
																	thisViewer.gammaRedVisible = true;
																	thisViewer.gammaGreenVisible = true;
																	thisViewer.gammaBlueVisible = true;
																	thisViewer.hueVisible = true;
																	thisViewer.saturationVisible = true;
																	thisViewer.lightnessVisible = true;
																	thisViewer.whiteBalanceVisible = true;
																	//thisViewer.normalizeVisible = true;
																	//thisViewer.equalizeVisible = true;
																	thisViewer.noiseVisible = true;
																	thisViewer.grayscaleVisible = true;
																	thisViewer.thresholdVisible = true;
																	thisViewer.inversionVisible = true;
																	thisViewer.edgesVisible = true;
																	thisViewer.sepiaVisible = true;
																	break;
																case 'creative' :
																	thisViewer.brightnessVisible = true;
																	thisViewer.contrastVisible = true;
																	thisViewer.sharpnessVisible = true;
																	thisViewer.blurrinessVisible = true;
																	thisViewer.colorRedVisible = true;
																	thisViewer.colorGreenVisible = true;
																	thisViewer.colorBlueVisible = true;
																	thisViewer.gammaVisible = true;
																	thisViewer.whiteBalanceVisible = true;
																	thisViewer.noiseVisible = true;
																	thisViewer.grayscaleVisible = true;
																	thisViewer.inversionVisible = true;
																	thisViewer.sepiaVisible = true;
																	break;
																case 'hsl' :
																	thisViewer.hueVisible = true;
																	thisViewer.saturationVisible = true;
																	thisViewer.lightnessVisible = true;
																	break;
																case 'pathology' :
																	thisViewer.brightnessVisible = true;
																	thisViewer.contrastVisible = true;
																	thisViewer.sharpnessVisible = true;
																	//thisViewer.colorRedVisible = true;
																	//thisViewer.colorGreenVisible = true;
																	//thisViewer.colorBlueVisible = true;
																	//thisViewer.gammaVisible = true;
																	thisViewer.gammaRedVisible = true;
																	thisViewer.gammaGreenVisible = true;
																	thisViewer.gammaBlueVisible = true;
																	thisViewer.whiteBalanceVisible = true;
																	//thisViewer.normalizeVisible = true;
																	//thisViewer.equalizeVisible = true;
																	thisViewer.thresholdVisible = true;
																	thisViewer.edgesVisible = true;
																	break;
																case 'colors' :
																	thisViewer.colorRedVisible = true;
																	thisViewer.colorGreenVisible = true;
																	thisViewer.colorBlueVisible = true;
																	break;
																case 'ranges' :
																	thisViewer.colorRedRangeVisible = true;
																	thisViewer.colorGreenRangeVisible = true;
																	thisViewer.colorBlueRangeVisible = true;
																	break;
																case 'gammaColors' :
																	thisViewer.gammaRedVisible = true;
																	thisViewer.gammaGreenVisible = true;
																	thisViewer.gammaBlueVisible = true;
																	break;
																case 'external' :
																	thisViewer.imageFilters = 'external';
																	thisViewer.imageFiltersVisible = true;
																	thisViewer.fadeIn = false;
																	break;
															}
														}
														break;
													case 'zInitialImageFilters' :  // '0'=false, '1'=true (default).
														if (pValue == '0') { thisViewer.initialImageFilters = false; }
														break;
													case 'zBrightnessVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.brightnessVisible = true; }
														break;
													case 'zContrastVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.contrastVisible = true; }
														break;
													case 'zSharpnessVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.sharpnessVisible = true; }
														break;
													case 'zBlurrinessVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.blurrinessVisible = true; }
														break;
													case 'zColorRedVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.colorRedVisible = true; }
														break;
													case 'zColorGreenVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.colorGreenVisible = true; }
														break;
													case 'zColorBlueVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.colorBlueVisible = true; }
														break;
													case 'zColorRedRangeVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.colorRedRangeVisible = true; }
														break;
													case 'zColorGreenRangeVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.colorGreenRangeVisible = true; }
														break;
													case 'zColorBlueRangeVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.colorBlueRangeVisible = true; }
														break;
													case 'zGammaVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.gammaVisible = true; }
														break;
													case 'zGammaRedVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.gammaRedVisible = true; }
														break;
													case 'zGammaGreenVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.gammaGreenVisible = true; }
														break;
													case 'zGammaBlueVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.gammaBlueVisible = true; }
														break;
													case 'zHueVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.hueVisible = true; }
														break;
													case 'zSaturationVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.saturationVisible = true; }
														break;
													case 'zLightnessVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.lightnessVisible = true; }
														break;
													case 'zWhiteBalanceVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.whiteBalanceVisible = true; }
														break;
													case 'zNormalizeVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.normalizeVisible = true; }
														break;
													case 'zEqualizeVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.equalizeVisible = true; }
														break;
													case 'zNoiseVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.noiseVisible = true; }
														break;
													case 'zGrayscaleVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.grayscaleVisible = true; }
														break;
													case 'zThresholdVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.thresholdVisible = true; }
														break;
													case 'zInversionVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.inversionVisible = true; }
														break;
													case 'zEdgesVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.edgesVisible = true; }
														break;
													case 'zSepiaVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.sepiaVisible = true; }
														break;

													case 'zAnnotationPath' :
														thisViewer.annotationPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
														if (typeof thisViewer.annotationPath !== 'undefined' && Z.Utils.stringValidate(thisViewer.annotationPath)) {
															thisViewer.annotationFolder = thisViewer.annotationPath;
															if (thisViewer.annotationPath.toLowerCase().substring(thisViewer.annotationPath.length - 4, thisViewer.annotationPath.length) == '.xml') {
																thisViewer.annotationFolder = thisViewer.annotationFolder.substring(0, thisViewer.annotationFolder.lastIndexOf('/'));
															}
															thisViewer.annotations = true;
														} else {
															alert(Z.Utils.getResource('ERROR_ANNOTATIONPATHMISSING')); // DEV NOTE: Use alert rather than showMessage as Viewer display initializing and yet not ready for message display.
														}
														break;
													case 'zAnnotationPanelVisible' :  // '0'=hide, '1'=show, '2'= initially show then hide on mouse-out (default), '3'=initially hide then show when mouse over. '4' hides and does not show on mouse-over to support integration projects. Use thisViewer.Toolbar.setVisibilityAnnotationPanel(true) to show.
														thisViewer.annotationPanelVisible = parseInt(pValue, 10);
														break;
													case 'zAnnotationXMLText' :
														thisViewer.annotationXMLText = pValue;
														thisViewer.annotations = true;
														break;
													case 'zLabelIconsInternal' :  // '0'=false, '1'=true (default), '2'=permit shapes and external graphics (no auto-sustitution, primarily for debugging).
														if (pValue == '0') { thisViewer.labelIconsInternal = false; }
														break;
													case 'zAnnotationJSONObject' :
														thisViewer.annotationJSONObject = pValue;
														thisViewer.annotations = true;
														break;
													case 'zAnnotationsAddMultiple' :  // '0'=false, '1'=true (default).
														if (pValue == '0') { thisViewer.annotationsAddMultiple = false; }
														break;
													case 'zAnnotationsAutoSave' :  // '0'=false, '1'=true, XML file only (default), '2'=true, XML & image file.
														if (pValue == '0') { 
															thisViewer.annotationsAutoSave = false;
														} else if (pValue == '2') { 
															thisViewer.annotationsAutoSaveImage = true;
														}
														break;
													case 'zSaveButtonVisible' :  // '0'=false, '1'=true (default).
														if (pValue == '0') { thisViewer.saveButtonVisible = false; }
														break;
													case 'zLabelClickSelect' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.labelClickSelect = true; }
														break;

													case 'zSimplePath' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.simplePath = true; }
														break;
													case 'zNoPost' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.noPost = true; }
														break;
													case 'zNoPostDefaults' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.noPostDefaults = true; }
														break;
													case 'zUnsavedEditsTest' :  // '0'=false, '1'=true (true).
														if (pValue == '0') { thisViewer.unsavedEditsTest = false; }
														break;
													case 'zAnnotationSort' :  // Supported values are common to list arrays of POIs, labels, and notes: 'id' (value), 'name' (text), and 'none' (no sorting, default).
														thisViewer.annotationSort = pValue;
														break;

													case 'zMaskVisible' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.maskVisible = true; }
														break;
													case 'zMaskScale' :  // Factor applied to size of mask area.
														thisViewer.maskScale = parseFloat(pValue);
														break;
													case 'zMaskBorder' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.maskBorder = true; }
														break;
													case 'zMaskFadeSpeed' : // '1'=slow to '10'=fast, default is '5', '0' = no fade-in.
														thisViewer.maskFadeSpeed = parseInt(pValue, 10);
														break;
													case 'zMaskClearOnUserAction' : // '0'=false, '1'=true (default).
														if (pValue == '0') { thisViewer.maskClearOnUserAction = false; }
														break;

													case 'zFreehandVisible' :  // '0'=false, '1'=true (default).
														if (pValue == '0') { thisViewer.freehandVisible = false; }
														break;
													case 'zTextVisible' :  // '0'=false, '1'=true (default).
														if (pValue == '0') { thisViewer.textVisible = false; }
														break;
													case 'zIconVisible' :  // '0'=false, '1'=true (default).
														if (pValue == '0') { thisViewer.iconVisible = false; }
														break;
													case 'zRectangleVisible' :  // '0'=false, '1'=true (default).
														if (pValue == '0') { thisViewer.rectangleVisible = false; }
														break;
													case 'zPolygonVisible' :  // '0'=false, '1'=true (default).
														if (pValue == '0') { thisViewer.polygonVisible = false; }
														break;

													case 'zMarkupMode' :
														if (pValue == '1' || pValue == '2') {
															if (thisViewer.annotationPathProvided || thisViewer.imageSetPathProvided) {
																thisViewer.editMode = 'markup';
																thisViewer.editing = 'addLabel';
																if (pValue == '2') { thisViewer.editAdmin = true; }

																// DEV NOTE: Alternative implementation - alert rather than simply hiding Save button
																// if (!thisViewer.saveHandlerProvided) { alert(Z.Utils.getResource('ERROR_XMLSAVEHANDLERPATHMISSING')); } // DEV NOTE: Use alert rather than showMessage as Viewer display initializing and yet not ready for message display.
															} else {
																alert(Z.Utils.getResource('ERROR_ANNOTATIONPATHMISSING')); // DEV NOTE: Use alert rather than showMessage as Viewer display initializing and yet not ready for message display.
															}
														}
														break;

													case 'zEditMode' :
														if (pValue == '1' || pValue == '2') {
															if (thisViewer.annotationPathProvided || thisViewer.imageSetPathProvided) {
																thisViewer.editMode = 'edit';
																if (pValue == '2') { thisViewer.editAdmin = true; }

																// DEV NOTE: Alternative implementation - alert rather than simply hiding Save button
																// if (!thisViewer.saveHandlerProvided) { alert(Z.Utils.getResource('ERROR_XMLSAVEHANDLERPATHMISSING')); } // DEV NOTE: Use alert rather than showMessage as Viewer display initializing and yet not ready for message display.
															} else {
																alert(Z.Utils.getResource('ERROR_ANNOTATIONPATHMISSING')); // DEV NOTE: Use alert rather than showMessage as Viewer display initializing and yet not ready for message display.
															}
														}
														break;

													case 'zSlidestackPath' :
														thisViewer.imageSetPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
														thisViewer.imageSet = true;
														thisViewer.slidestack = true;
														if (!thisViewer.mouseWheelParmeterProvided) {
															thisViewer.mouseWheel = parseInt(Z.Utils.getResource('DEFAULT_MOUSEWHEELSLIDESTACK'), 10);
															thisViewer.sliderFocus = (thisViewer.mouseWheel == 2) ? 'imageSet' : 'zoom';
														}
														break;

													case 'zSaveHandlerPath' :
														thisViewer.saveHandlerPath = pValue;
														break;

													case 'zSaveImageHandlerPath' :
														thisViewer.saveImageHandlerPath = pValue;
														break;
													case 'zSaveImageFull' :  // '0'=false (default), '1'=true.
														if (pValue == '1') { thisViewer.saveImageFull = true; }
														break;
													case 'zSaveImageFilename' : // Default is 'zoomifySavedImage'.
														if (Z.Utils.stringValidate(pValue)) { thisViewer.saveImageFilename = pValue; }
														break;
													case 'zSaveImageFormat' :  // Supported values: 'png' and 'jpg' (default).
														switch (pValue.toLowerCase()) {
															case 'png' :
																thisViewer.saveImageFormat = 'png';
																break;
															default :
																thisViewer.saveImageFormat = 'jpg';
														}
														break;
													case 'zSaveImageCompression' :  // Supported values: '0.1' to '1.0', default '0.8'.
														var temp = parseFloat(pValue);
														if (!isNaN(temp) && temp >= 0.1 && temp <= 1) { thisViewer.saveImageCompression = temp; }
														break;
													case 'zSaveImageBackColor' :  // Valid web color, '#' character permitted but not required.
														thisViewer.saveImageBackColor = Z.Utils.stringValidateColorValue(pValue);
														break;

													case 'zTrackingPath' :
														thisViewer.trackingPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
														if (typeof thisViewer.trackingPath !== 'undefined' && Z.Utils.stringValidate(thisViewer.trackingPath)) {
															thisViewer.trackingFolder = thisViewer.trackingPath;
															if (thisViewer.trackingPath.toLowerCase().substring(thisViewer.trackingPath.length - 4, thisViewer.trackingPath.length) == '.xml') {
																thisViewer.trackingFolder = thisViewer.trackingFolder.substring(0, thisViewer.trackingFolder.lastIndexOf('/'));
															}
															thisViewer.tracking = true;
														} else {
															alert(Z.Utils.getResource('ERROR_TRACKINGPATHMISSING')); // DEV NOTE: Use alert rather than showMessage as Viewer display initializing and yet not ready for message display.
														}
														break;
													case 'zTrackingEditMode' :
														if (pValue == '1') {
															if (thisViewer.trackingPathProvided) {
																thisViewer.trackingEditMode = 'edit';
																thisViewer.markupMode = true;
																thisViewer.editMode = 'markup';
																thisViewer.editing = 'addLabel';
																thisViewer.labelMode = 'counter';
															} else {
																alert(Z.Utils.getResource('ERROR_TRACKINGPATHMISSING-EDITING')); // DEV NOTE: Use alert rather than showMessage as Viewer display initializing and yet not ready for message display.
															}
														}
														break;
													case 'zTrackingAuto' :  // '0'=false (default), '1'=true. Changes 'Complete' checkbox to 'Viewed' and auto-sets true after default viewing time interval.
														if (pValue == '1') { thisViewer.trackingAuto = true; }
														break;
													case 'zTrackingPanelVisible' :  // '0'=hide, '1'=show, '2'= initially show then hide on mouse-out (default), '3'=initially hide then show when mouse over. '4' hides and does not show on mouse-over to support integration projects. Use thisViewer.Toolbar.setVisibilityTrackingPanel(true) to show.
														thisViewer.trackingPanelVisible = parseInt(pValue, 10);
														break;
													case	'zInitialTrackingOverlayVisible' : // '0'=false, '1'=true (default).
														if (pValue == '0') { thisViewer.initialTrackingOverlayVisible = false; }
														break;

													case 'zUserLogin' :  // '1'=request user name on init, 'skip'=assign default value, other string=hide request and set string as username for annotation time/date stamps and tracking.
														if (pValue == '1') {
															thisViewer.userLogin = 'request';
														} else if (pValue == 'skip') {
															thisViewer.userName = Z.Utils.getResource('CONTENT_SKIPUSERNAME');
															thisViewer.userInitials = Z.Utils.stringGetInitials(thisViewer.userName);
														} else if (Z.Utils.stringValidate(pValue)) {
															thisViewer.userName = pValue;
															thisViewer.userInitials = Z.Utils.stringGetInitials(thisViewer.userName);
														}
														break;
													case 'zUserNamePrompt' :
														if (Z.Utils.stringValidate(pValue)) { thisViewer.userNamePrompt = pValue; }
														break;
													case 'zUserPath' :
														thisViewer.userPath = Z.Utils.stringRemoveTrailingSlashCharacters(pValue);
														if (typeof thisViewer.userPath !== 'undefined' && Z.Utils.stringValidate(thisViewer.userPath)) {
															thisViewer.userFolder = thisViewer.userPath;
															if (thisViewer.userPath.toLowerCase().substring(thisViewer.userPath.length - 4, thisViewer.userPath.length) == '.xml') {
																thisViewer.userFolder = thisViewer.userFolder.substring(0, thisViewer.userFolder.lastIndexOf('/'));
															}
															thisViewer.userLogging = true;
														} else {
															alert(Z.Utils.getResource('ERROR_USERPATHMISSING')); // DEV NOTE: Use alert rather than showMessage as Viewer display initializing and yet not ready for message display.
														}
														break;
													case 'zUserPanelVisible' : // '0'=hide, '1'=show, '2'= initially show then hide on mouse-out (default), '3'=initially hide then show when mouse over. '4' hides and does not show on mouse-over to support integration projects. Use thisViewer.Toolbar.setVisibilityUserPanel(true) to show.
														if (pValue != '0') {
															if (thisViewer.userPathProvided) {
																thisViewer.userPanelVisible = parseInt(pValue, 10);
															} else {
																alert(Z.Utils.getResource('ERROR_USERPATHMISSING')); // DEV NOTE: Use alert rather than showMessage as Viewer display initializing and yet not ready for message display.
															}
														}
														break;

													default :
														if (thisViewer.specialStorageEnabled == specialStorageDisableValue) {
															alert(specialStorageDisabledAlert + ' ' +pName);
														} else {
															switch (pName) {

																case 'zServerIP' :
																	thisViewer.serverIP = pValue;
																	break;
																case 'zServerPort' :
																	thisViewer.serverPort = pValue;
																	break;
																case 'zTileHandlerPath' :
																	thisViewer.tileHandlerPath = pValue;
																	break;

																case	'zRequestTiles' : // '0'=false (default), '1'=true. // Override to force tile requests when using ZIF storage with image server for tile request fulfillment.
																	if (pValue == '1') { thisViewer.requestTiles = true; }
																	break;

																case 'zIIIFScheme' :
																	thisViewer.iiifScheme = pValue;
																	break;
																case 'zIIIFServer' :
																	thisViewer.iiifServer = pValue;
																	break;
																case 'zIIIFPrefix' :
																	thisViewer.iiifPrefix = pValue;
																	break;
																case 'zIIIFIdentifier' :
																	thisViewer.iiifIdentifier = pValue;
																	break;
																case 'zIIIFRegion' :
																	thisViewer.iiifRegion = pValue;
																	break;
																case 'zIIIFSize' :
																	thisViewer.iiifSize = pValue;
																	break;
																case 'zIIIFRotation' :
																	thisViewer.iiifRotation = pValue;
																	break;
																case 'zIIIFQuality' :
																	thisViewer.iiifQuality = pValue;
																	break;
																case 'zIIIFFormat' :
																	thisViewer.iiifFormat = pValue;
																	break;

																case 'zImageW' :
																	thisViewer.imageW = parseInt(pValue, 10);
																	thisViewer.imageCtrX = thisViewer.imageW / 2;
																	if (thisViewer.imageW != null && thisViewer.imageW > 0 && thisViewer.imageH != null && thisViewer.imageH > 0) { thisViewer.imageD = Math.round(Math.sqrt(thisViewer.imageW * thisViewer.imageW + thisViewer.imageH * thisViewer.imageH)); }
																	break;
																case 'zImageH' :
																	thisViewer.imageH = parseInt(pValue, 10);
																	thisViewer.imageCtrY = thisViewer.imageH / 2;
																	if (thisViewer.imageW != null && thisViewer.imageW > 0 && thisViewer.imageH != null && thisViewer.imageH > 0) { thisViewer.imageD = Math.round(Math.sqrt(thisViewer.imageW * thisViewer.imageW + thisViewer.imageH * thisViewer.imageH)); }
																	break;

																// Deprecated: Use zSourceMagnification.
																/*case 'zMagnification' :
																	thisViewer.sourceMagnification = parseInt(pValue, 10);
																	break;*/

																case 'zFocal' :
																	thisViewer.focal = parseInt(pValue, 10);
																	break;
																case 'zQuality' :
																	thisViewer.quality = parseInt(pValue, 10);
																	break;
															}
														}
												}
											}
									}
								}
								break;
						}
					}
				}
			}
		}

		// Process or disallow special paths for annotation features.
		if (Z.Utils.stringValidate(thisViewer.annotationPath) || Z.Utils.stringValidate(thisViewer.saveHandlerPath) || Z.Utils.stringValidate(thisViewer.saveImageHandlerPath)) {
			if (thisViewer.enterpriseParamsEnabled) {
				if (Z.Utils.stringValidate(thisViewer.saveHandlerPath)) {
					// Build full save handler paths.
					var sHPF = thisViewer.saveHandlerPath;
					var sIHPF = thisViewer.saveImageHandlerPath;

					// DEV NOTE: JavaScript cross-domain block conflicts with specifying server IP and port.
					/*	if (sHPF.substr(0,1) != '/') { sHPF = '/' + sHPF; }
						if (thisViewer.serverPort != '80') { sHPF = ':' + thisViewer.serverPort + sHPF; }
						sHPF = thisViewer.serverIP + sHPF;
						if (sIHPF.substr(0,1) != '/') { sIHPF = '/' + sIHPF; }
						if (thisViewer.serverPort != '80') { sIHPF = ':' + thisViewer.serverPort + sIHPF; }
						sIHPF = thisViewer.serverIP + sIHPF;
					*/

					thisViewer.saveHandlerPath = sHPF;
					thisViewer.saveImageHandlerPath = sIHPF;
				}
			} else {
				thisViewer.annotationPath = '';
				alert(enterpriseParamsDisabledAlert);
			}
		}				
		validateImagePath();
	}

	function resetParametersXYZ (params) {
		if (!isNaN(parseFloat(Z.Utils.getResource('DEFAULT_INITIALX')))) { thisViewer.initialX = parseFloat(Z.Utils.getResource('DEFAULT_INITIALX')); }
		if (!isNaN(parseFloat(Z.Utils.getResource('DEFAULT_INITIALY')))) { thisViewer.initialY = parseFloat(Z.Utils.getResource('DEFAULT_INITIALY')); }
		if (!isNaN(parseFloat(Z.Utils.getResource('DEFAULT_INITIALZOOM')))) { thisViewer.initialZ = parseFloat(Z.Utils.getResource('DEFAULT_INITIALZOOM')); }
		if (!isNaN(parseFloat(Z.Utils.getResource('DEFAULT_MINZOOM')))) { thisViewer.minZ = parseFloat(Z.Utils.getResource('DEFAULT_MINZOOM')); }
		if (!isNaN(parseFloat(Z.Utils.getResource('DEFAULT_MAXZOOM')))) { thisViewer.maxZ = parseFloat(Z.Utils.getResource('DEFAULT_MAXZOOM')); }

		if (Z.Utils.stringValidate(params)) {
			for (var i = 0, j = params.length; i < j; i++) {
				var nameValuePair = params[i];
				var sep = nameValuePair.indexOf('=');
				if (sep > 0) {
					var pName = nameValuePair.substring(0, sep);
					var pValue = nameValuePair.substring(sep + 1);
					if (Z.Utils.stringValidate(pValue)) {
						switch (pName) {
							case 'zInitialX' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { thisViewer.initialX = parseFloat(pValue); }
								break;
							case 'zInitialY' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { thisViewer.initialY = parseFloat(pValue); }
								break;
							case 'zInitialZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }
								if (!isNaN(parseFloat(pValue))) {
									thisViewer.initialZ = parseFloat(pValue);
									if (thisViewer.initialZ && thisViewer.initialZ > 1) { thisViewer.initialZ /= 100; }
								}
								break;
							case 'zMinZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }
								if (!isNaN(parseFloat(pValue))) {
									thisViewer.minZ = parseFloat(pValue);
									if (thisViewer.minZ && thisViewer.minZ > 1) { thisViewer.minZ /= 100; }
								}
								break;
							case 'zMaxZoom' : // '1' to '100' recommended range (internally 0.1 to 1), default is 1 (100%).
								if (!isNaN(parseFloat(pValue))) {
									thisViewer.maxZ = parseFloat(pValue);
									if (thisViewer.maxZ && thisViewer.maxZ > 1) { thisViewer.maxZ /= 100; }
								}
								break;
						}
					}
				}
			}
		}
	}
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::: PATH FUNCTIONS :::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.getImagePath = function () {
		return thisViewer.getImage();
	}

	this.getImage = function () {
		return thisViewer.imagePath;
	}

	// This function included for backward compatibility with version 1.
	this.setImagePath = function (imagePath, imageProperties) {
		if (typeof imageProperties !== 'undefined' && Z.Utils.stringValidate(imageProperties)) {
			thisViewer.imageProperties = imageProperties;
		}
		thisViewer.setImage(imagePath);
	}

	// Use setImage to set image path as well as any image-specific optional parameters, and any non-image-specific
	// optional parameter including viewport, toolbar, navigator, tour, slide, hotspot, annotation, or other parameters.
	// Use showImage to force a full viewer reinitialization including all related components: toolbar, navigator, etc.
	this.setImage = function (imagePath, optionalParams, initializingCall, vpID) {

		if (thisViewer.Viewport && (thisViewer.Viewport.getStatus('initializedViewport') || initializingCall)) {
			thisViewer.Viewport.zoomAndPanAllStop(true);

			var proceed = true;
			if (thisViewer.editing !== null) { proceed = validateExitCustom(); }
			if (proceed) {

				// Clear mask and image-specific optional parameters.
				if (thisViewer.maskingSelection) { thisViewer.clearLabelMask(); }
				if (!thisViewer.overlays) { clearImageParameters(); }

				// Clearing here unnecessary because occurs in function reinitializeViewport.
				//thisViewer.Viewport.clearAll(true, true, true, true);

				// Reset image path.
				thisViewer.imagePath = Z.Utils.stringRemoveTrailingSlashCharacters(imagePath);
				validateImagePath();

				var targetViewport;
				if (typeof vpID === 'undefined' || vpID === null || vpID == 0) {
					targetViewport = thisViewer.Viewport;
				} else {
					targetViewport = thisViewer['Viewport' + vpID.toString()];
				}

				targetViewport.setImagePath(thisViewer.imagePath);
				if (typeof optionalParams !== 'undefined' && optionalParams !== null) { thisViewer.parameters = Z.Utils.parseParameters(optionalParams); }

				// If initializing, set parameters, otherwise, handled in function reinitializeViewport.
				if (initializingCall) { setParameters(thisViewer.parameters); }

				if (thisViewer.tileSource == 'unconverted') {
					targetViewport.loadUnconvertedImage(imagePath);
				} else if (!thisViewer.imageProperties) {
					var netConnector = new Z.NetConnector(thisViewer);
					targetViewport.loadImageProperties(thisViewer.imagePath, netConnector, vpID);
				} else {
					var xmlDoc = Z.Utils.xmlConvertTextToDoc(thisViewer.imageProperties);
					targetViewport.parseImageXML(xmlDoc);
				}
			}
		}
	}

	this.setImageWithFade = function (imagePath, optionalParams, initializingCall, changeFor) {
		if (thisViewer.Viewport && (thisViewer.Viewport.getStatus('initializedViewport') || initializingCall)) {
			if (typeof changeFor === 'undefined' || changeFor === null) { changeFor = 50; }
			thisViewer.slideTransitionTimeout = window.setTimeout( function () { thisViewer.Viewport.slideTransitionTimeoutHandler('out', imagePath, optionalParams, initializingCall); }, 1);
		}
	}

	this.setTourPath = function (tourPath, noReload) {
		if (thisViewer.Viewport && thisViewer.Viewport.getStatus('initializedViewport')) {
			thisViewer.Viewport.setHotspotPath(tourPath, noReload);
		}
	}

	this.setHotspotPath = function (hotspotPath, noReload) {
		if (thisViewer.Viewport && thisViewer.Viewport.getStatus('initializedViewport')) {
			thisViewer.Viewport.setHotspotPath(hotspotPath, noReload);
		}
	}

	this.setAnnotationPath = function (annotationPath, noReload) {
		if (thisViewer.Viewport && thisViewer.Viewport.getStatus('initializedViewport')) {
			thisViewer.Viewport.setAnnotationPath(annotationPath, noReload);
		}
	}

	this.setTrackingPath = function (trackingPath, noReload) {
		if (thisViewer.Viewport && thisViewer.Viewport.getStatus('initializedViewport')) {
			thisViewer.Viewport.setTrackingPath(trackingPath, noReload);
		}
	}

	this.initializePageExitEventHandler = function () {
		Z.Utils.addEventListener(window, 'beforeunload', validateExitBrowser);
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: GET & SET FUNCTIONS :::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.getStatus = function (vState) {
		return getStatus(vState);
	}

	function getStatus (vState) {
		var index = Z.Utils.arrayIndexOfObjectValue(viewerStatus, 'state', vState);
		var statusVal = (index == -1) ? false : viewerStatus[index].status;
		return statusVal;
	}

	this.setStatus = function (vState, vStatus) {
		setStatus(vState, vStatus);
	}
	
	function setStatus (vState, vStatus) {
		var notYetSet = false;
		var index = Z.Utils.arrayIndexOfObjectValue(viewerStatus, 'state', vState);
		if (index == -1) {
			notYetSet = vStatus;
			viewerStatus[viewerStatus.length] = { state:vState, status:vStatus };
		} else {
			if (!viewerStatus[index].status && vStatus) { notYetSet = true; }
			viewerStatus[index].status = vStatus;
		}
		if (notYetSet) {
			validateCallback(vState);
			validateViewerReady(vState);
		}
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::: VALIDATION FUNCTIONS :::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.validateViewerStatus = function (vState) {
		validateViewerStatus(vState);
	}
	
	function validateViewerStatus (vState) {
		var statusVal = true;
		if (thisViewer.imageSet) {
			for (var i = 0, j = thisViewer.imageSetLength; i < j; i++) {
				var vpTest = thisViewer['Viewport' + i.toString()];
				if (!vpTest.getStatus(vState)) {
					statusVal = false;
					break;
				}
			}
		}
		if (statusVal) {
			var indexVP = vState.indexOf('Viewport');
			if (indexVP != -1) { vState = vState.substring(0, indexVP); }
			setStatus(vState + 'Viewer', true);
		}
	}

	this.validateViewerReady = function (vState) {
		validateViewerReady(vState);
	}
	
	function validateViewerReady (vState) {		
		var viewerReady = false;
		
		if (thisViewer && thisViewer.Viewport && typeof thisViewer.Viewport.getStatus !== 'undefined') {
			var viewportOK = (thisViewer.Viewport.getStatus('initializedViewport') && (thisViewer.tileSource == 'unconverted' || (thisViewer.Viewport.getStatus('precacheLoadedViewport') && thisViewer.Viewport.getStatus('backfillLoadedViewport') && thisViewer.Viewport.getStatus('backfillDrawnViewport'))) && thisViewer.Viewport.getStatus('displayLoadedViewport') && thisViewer.Viewport.getStatus('displayDrawnViewport'));
			var hotspotsOK = (!thisViewer.hotspots || (thisViewer.Viewport.getStatus('hotspotsLoadedViewport')));
			var annotationsOK = (!thisViewer.annotations || (thisViewer.Viewport.getStatus('annotationsLoadedViewport') && (!thisViewer.annotationPanelVisible || thisViewer.Viewport.getStatus('annotationPanelInitializedViewport'))));
			var toolbarOK = (thisViewer.toolbarVisible == 0 || (thisViewer.Toolbar && thisViewer.Toolbar.getInitialized()));
			var navigatorOK = (!thisViewer.navigatorVisible || (thisViewer.Navigator && thisViewer.Navigator.getInitialized()));
			var galleryOK = (!thisViewer.galleryVisible || (thisViewer.Gallery && thisViewer.Gallery.getInitialized()));
			var rulerOK = (!thisViewer.rulerVisible || (thisViewer.Ruler && thisViewer.Ruler.getInitialized()));
			var imageSetOK = (!thisViewer.imageSet || (self && getStatus('initializedViewer') && (thisViewer.tileSource == 'unconverted' || (thisViewer.getStatus('precacheLoadedViewer')  && thisViewer.getStatus('backfillLoadedViewer') && thisViewer.getStatus('backfillDrawnViewer'))) && thisViewer.getStatus('displayLoadedViewer') && thisViewer.getStatus('displayDrawnViewer')));
			var imageSetHotspotsOK = (!thisViewer.imageSet || !thisViewer.hotspots || (self && thisViewer.getStatus('hotspotsLoadedViewer')));
			var imageSetAnnotationsOK = (!thisViewer.imageSet || !thisViewer.annotations || (self && thisViewer.getStatus('annotationsLoadedViewer') && (!thisViewer.annotationPanelVisible || thisViewer.getStatus('annotationPanelInitializedViewer'))));
			var viewerReady = viewportOK && hotspotsOK && annotationsOK && toolbarOK && navigatorOK && galleryOK && rulerOK && imageSetOK && imageSetHotspotsOK && imageSetAnnotationsOK;
		}

		// Debug options:
		//console.log('In validateViewerReady - state: ' + vState + '   viewerReady: ' + viewerReady + '    values: ' + viewportOK + '  ' + hotspotsOK + '  ' + annotationsOK + '  ' + toolbarOK + '  ' + navigatorOK + '  ' + galleryOK + '  ' + rulerOK + '  ' + imageSetOK + '  ' + imageSetHotspotsOK + '  ' + imageSetAnnotationsOK);
		//console.log(thisViewer.Viewport.getStatus('backfillLoadedViewport'), thisViewer.Viewport.getStatus('displayLoadedViewport'), thisViewer.Viewport.getStatus('backfillDrawnViewport'), thisViewer.Viewport.getStatus('displayDrawnViewport'));
	
		if (viewerReady) { setStatus('readyViewer', true); }
		return viewerReady;
	}

	function validateExitBrowser (event) {
		var event = Z.Utils.event(event);
		if (event) {
			var confirmationMessage = null;
			if (thisViewer.editing !== null && thisViewer.Viewport.verifyEditsUnsaved()) {
				confirmationMessage = Z.Utils.getResource('ALERT_UNSAVEDEDITSEXIST-BROWSER');
				event.returnValue = confirmationMessage;
				return confirmationMessage;
			}
		}
	}

	function validateExitCustom () {
		var endEditing = true;
		if (thisViewer.editing !== null && thisViewer.Viewport.verifyEditsUnsaved()) {
			endEditing = confirm(Z.Utils.getResource('ALERT_UNSAVEDEDITSEXIST-CUSTOM'));
		}
		return endEditing;
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::: PARAMETER & RESOURCE FUNCTIONS :::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.parseParametersXML = function (xmlDoc) {
		thisViewer.xmlParametersParsing = false;
		var optionalParams = '';
		var embedRoot = xmlDoc.getElementsByTagName('ZOOMIFY')[0];

		// Get image path values and apply.
		zImagePath = embedRoot.getAttribute('IMAGEPATH');
		zImagePath2 = embedRoot.getAttribute('IMAGEPATH2');
		if (typeof zImagePath !== 'undefined' && Z.Utils.stringValidate(zImagePath)) { thisViewer.imagePath = zImagePath; }
		if (typeof zImagePath2 !== 'undefined' && Z.Utils.stringValidate(zImagePath2)) { thisViewer.imagePath2 = zImagePath2; }

		// Get values with standard parameter names.
		var parameterListTextArray = Z.Utils.getResource('DEFAULT_PARAMETERLISTTEXT', thisViewer).split(',');
		for (var i = 0, j = parameterListTextArray.length; i < j; i++) {
			var pName = parameterListTextArray[i];
			var pNameBase = Z.Utils.stringLowerCaseFirstLetter(pName.substr(1));
			var pAttribName = pNameBase.toUpperCase();
			var pVal = embedRoot.getAttribute(pAttribName);
			if (typeof pVal !== 'undefined' && Z.Utils.stringValidate(pVal)) {
				optionalParams += pName + '=' + pVal + '&';
			}
		}

		// Get values with legacy names.
		var legacyVal = embedRoot.getAttribute('FULLPAGEINITIAL');
		if (typeof legacyVal !== 'undefined' && Z.Utils.stringValidate(legacyVal)) { optionalParams += 'zInitialFullPage=' + legacyVal + '&'; }
		var legacyVal = embedRoot.getAttribute('TOOLBARSKINXMLPATH');
		if (typeof legacyVal !== 'undefined' && Z.Utils.stringValidate(legacyVal)) { optionalParams += 'zSkinPath=' + legacyVal + '&'; }
		var legacyVal = embedRoot.getAttribute('TOOLBARTOOLTIPS');
		if (typeof legacyVal !== 'undefined' && Z.Utils.stringValidate(legacyVal)) { optionalParams += 'zTooltipsVisible=' + legacyVal + '&'; }
		var legacyVal = embedRoot.getAttribute('SHOWTOOLTIPS');
		if (typeof legacyVal !== 'undefined' && Z.Utils.stringValidate(legacyVal)) { optionalParams += 'zTooltipsVisible=' + legacyVal + '&'; }
		var legacyVal = embedRoot.getAttribute('WATERMARKMEDIA');
		if (typeof legacyVal !== 'undefined' && Z.Utils.stringValidate(legacyVal)) { optionalParams += 'zWatermarkPath=' + legacyVal + '&'; }
		var legacyVal = embedRoot.getAttribute('SLIDESXMLPATH');
		if (typeof legacyVal !== 'undefined' && Z.Utils.stringValidate(legacyVal)) { optionalParams += 'zSlidePath=' + legacyVal + '&'; }
		var legacyVal = embedRoot.getAttribute('HOTSPOTSXMLPATH');
		if (typeof legacyVal !== 'undefined' && Z.Utils.stringValidate(legacyVal)) { optionalParams += 'zHotspotPath=' + legacyVal + '&'; }
		var legacyVal = embedRoot.getAttribute('ANNOTATIONSXMLPATH');
		if (typeof legacyVal !== 'undefined' && Z.Utils.stringValidate(legacyVal)) { optionalParams += 'zAnnotationPath=' + legacyVal + '&'; }
		var legacyVal = embedRoot.getAttribute('SAVETOFILE');
		if (typeof legacyVal !== 'undefined' && Z.Utils.stringValidate(legacyVal)) { optionalParams += 'zSaveImageHandlerPath=' + legacyVal + '&'; }

		// Process optional parameters.
		optionalParams = (optionalParams.slice(-1, optionalParams.length) == '&') ? optionalParams.slice(0, optionalParams.length - 1) : optionalParams;
		var optionalParamsUnescaped = unescape(optionalParams);
		var optionalParamsFullyUnescaped = Z.Utils.stringUnescapeAmpersandCharacters(optionalParamsUnescaped);
		Z.Utils.arrayClear(thisViewer.parameters);
		thisViewer.parameters = Z.Utils.parseParameters(optionalParamsFullyUnescaped);
		
		thisViewer.initializeViewer();
	}
	
	// Process or disallow special paths for storage options.
	this.validateImagePath = function (imageSetPath) {
		validateImagePath(imageSetPath);
	}
	
	function validateImagePath (imageSetPath) {	
		var imgPath = (typeof imageSetPath !== 'undefined' && Z.Utils.stringValidate(imageSetPath)) ? imageSetPath : thisViewer.imagePath;
		if (imgPath !== null) {
			var specialStorageDisabledAlert = Z.Utils.getResource('DEFAULT_SPECIALSTORAGESUPPORTDISABLEDALERT');
			
			Z.singleFileEnabled = false;
			if (imgPath.toLowerCase().indexOf('.zif') != -1 && !thisViewer.requestTiles) {
				thisViewer.imageFilename = imgPath.substring(imgPath.toLowerCase().lastIndexOf('/') + 1);
				if (Z.singleFileSupported) {
					thisViewer.tileSource = 'ZoomifyZIFFile';
					Z.singleFileEnabled = true;
					Z.Utils.validateResponseArrayFunctionality(thisViewer.tileSource, thisViewer.tileHandlerPathFull);
						
					// Set callback to create Viewer when local image file selected.
					if (Z.localUseEnabled && Z.localUseSupported && Z.singleFileEnabled && Z.localFileData === null) {
						thisViewer.setCallback('imageFileSelected', Z.createViewer);
						validateLocalSingleFileViewing();
					}
					
				} else {
					alert(Z.Utils.getResource('ALERT_ZIFREQUIRESNEWERBROWSER'));
				}

			} else if (imgPath.toLowerCase().indexOf('.jpg') != -1 || imgPath.toLowerCase().indexOf('.png') != -1) {
				thisViewer.tileSource = 'unconverted';

			} else if (imgPath.toLowerCase().indexOf('.pff') != -1 && !thisViewer.requestTiles) {
				thisViewer.imageFilename = imgPath.substring(imgPath.toLowerCase().lastIndexOf('/') + 1);
				if (thisViewer.specialStorageEnabled || Z.singleFileSupported) { // Servlet or byte functions supported.
					thisViewer.tileSource = 'ZoomifyPFFFile';
					Z.singleFileEnabled = true;
					Z.Utils.validateResponseArrayFunctionality(thisViewer.tileSource, thisViewer.tileHandlerPathFull);
					
					// Set callback to create Viewer when local image file selected.
					if (Z.localUseEnabled && Z.localUseSupported && Z.singleFileEnabled && Z.localFileData === null) {
						thisViewer.setCallback('imageFileSelected', Z.createViewer);
						validateLocalSingleFileViewing();
					}
					
					if (thisViewer.specialStorageEnabled && thisViewer.tileHandlerPath !== null) {
						// Build full tile handler path.
						var tHPF = thisViewer.tileHandlerPath;

						// DEV NOTE: JavaScript cross-domain block conflicts with specifying server IP and port.
						//if (tHPF.substr(0,1) != '/') { tHPF = '/' + tHPF; }
						//if (thisViewer.serverPort != '80') { tHPF = ':' + thisViewer.serverPort + tHPF; }
						//tHPF = thisViewer.serverIP + tHPF;

						thisViewer.tileHandlerPathFull = tHPF;
					}

				} else {
					if (!Z.singleFileSupported && thisViewer.tileHandlerPath === null) {
						alert(Z.Utils.getResource('ALERT_PFFREQUIRESNEWERBROWSER'));			
					} else if (!thisViewer.specialStorageEnabled) {
						alert(specialStorageDisabledAlert);
					}
				}

			} else if (Z.Utils.stringValidate(thisViewer.iiifServer)) {
				// IIIF server protocol implementation.
				thisViewer.tileSource = 'IIIFImageServer';

				var scheme = (typeof thisViewer.iiifScheme != 'undefined' && Z.Utils.stringValidate(thisViewer.iiifScheme)) ? thisViewer.iiifScheme + '://' : 'https' + '://';
				var server = (typeof thisViewer.iiifServer != 'undefined' && Z.Utils.stringValidate(thisViewer.iiifServer)) ? thisViewer.iiifServer + '/' : null;
				var prefix = (typeof thisViewer.iiifPrefix != 'undefined' && Z.Utils.stringValidate(thisViewer.iiifPrefix)) ? thisViewer.iiifPrefix + '/' : null;
				var identifier = (typeof thisViewer.iiifIdentifier != 'undefined' && Z.Utils.stringValidate(thisViewer.iiifIdentifier)) ? thisViewer.iiifIdentifier : null;
				if (scheme && server && identifier) {
					thisViewer.imagePath = scheme + server + prefix + identifier;
				} else {
					thisViewer.imagePath = Z.Utils.getResource('ERROR_SETTINGIIIFIMAGEPATH');
				}
				
			} else if (thisViewer.tileSource == 'DZIFolder' || imgPath.toLowerCase().indexOf('.dzi') != -1) {
				// Alternative method for supporting DZI folder.
				thisViewer.tileSource = 'DZIFolder';
				var imgPathLower = imgPath.toLowerCase();
				
				var slashIndexLast = imgPath.lastIndexOf('/');
				if (slashIndexLast == -1) { // No slash so no properties filename so must create.
					slashIndexLast = 0;
					thisViewer.dziImageSubfolder = imgPath;
					thisViewer.dziImagePropertiesFilename = thisViewer.dziImageSubfolder + '.dzi';
				
				} else {
					var slashIndexPrior = imgPath.substring(0, slashIndexLast).lastIndexOf('/');
					if (slashIndexPrior == -1) { slashIndexPrior = 0; }
					var tempFilenameLower = imgPathLower.substring(slashIndexLast + 1, imgPathLower.length);
					var extensionIndex = tempFilenameLower.indexOf('.dzi');
					if (extensionIndex != -1) { // Do not force lowercase for dzi property file name.
						thisViewer.dziImagePropertiesFilename = imgPath.substring(slashIndexLast + 1, imgPathLower.length);
					} else { // Do force lowercase for xml property file name.
						thisViewer.dziImagePropertiesFilename = imgPathLower.substring(slashIndexLast + 1, imgPathLower.length);
						extensionIndex = thisViewer.dziImagePropertiesFilename.toLowerCase().indexOf('.xml');
					}
					thisViewer.dziImageSubfolder = thisViewer.dziImagePropertiesFilename.substring(0, extensionIndex) + '_files';
					thisViewer.imagePath = imgPath.substring(0, slashIndexLast);
				}
				
			} else if (!Z.Utils.stringValidate(thisViewer.tileHandlerPath)) {
				thisViewer.tileSource = 'ZoomifyImageFolder';

			} else if (Z.Utils.stringValidate(thisViewer.tileHandlerPath)) {
				if (thisViewer.specialStorageEnabled) {
					 // Example image server protocol implementation.
					thisViewer.tileSource = 'ImageServer';

					// Build full tile handler path.
					var tHPF = thisViewer.tileHandlerPath;

					// DEV NOTE: JavaScript cross-domain block conflicts with specifying server IP and port.
					//if (tHPF.substr(0,1) != '/') { tHPF = '/' + tHPF; }
					//if (thisViewer.serverPort != '80') { tHPF = ':' + thisViewer.serverPort + tHPF; }
					//tHPF = thisViewer.serverIP + tHPF;

					thisViewer.tileHandlerPathFull = tHPF;

				} else {
					alert(specialStorageDisabledAlert);
				}
			}

		} else if (thisViewer.imageSet || thisViewer.slideshow) {
			thisViewer.tileSourceMultiple = true;
		}
	}

	this.validateLocalSingleFileViewing = function () {
		validateLocalSingleFileViewing();
	}
	
	function validateLocalSingleFileViewing () {
		var containerDims = Z.Utils.getContainerSize(thisViewer.pageContainer, thisViewer.ViewerDisplay);
		var contW = containerDims.x;
		var contH = containerDims.y;		
		var margin = 10;
		var faW = 308;
		var faH = 180;
		var faL = (contW - faW) / 2;
		var faT = (contH - faH) / 2;
		var textPad = 10;
		var titleW = faW - textPad * 4;
		var titleH = 28;
		var titleL = (faW - titleW) / 2 - textPad;
		var titleT = 15;
		var messageW = titleW;
		var messageH = 55;
		var messageL = titleL;
		var messageT = titleT + titleH;
		var btnContW = 240;
		var btnContH = 30;
		var btnContL = (faW - btnContW) / 2;
		var btnContT = faH - btnContH - 12;	
		
		Z.FileAccessDisplay = Z.Utils.createContainerElement(zvIntID, 'div', 'FileAccessDisplay', 'inline-block', 'relative', 'auto', faW + 'px', faH + 'px', faL + 'px', faT + 'px', 'solid', '1px', 'lightGrey', '0px', '0px', 'normal', null, true);
		thisViewer.ViewerDisplay.appendChild(Z.FileAccessDisplay);
		
		var titleTxt = Z.Utils.getResource('ALERT_VALIDATELOCALSINGLEFILEVIEWING-TITLE');
		var titleBox = Z.Utils.createTextElement(zvIntID, 'titleBox', titleTxt, titleW + 'px', titleH + 'px', titleL + 'px', titleT + 'px', textPad + 'px', 'none', '0px', true, 'verdana', '13px', 'none', null, 1, 'hidden', 'hidden', null);
		Z.FileAccessDisplay.appendChild(titleBox);
		titleBox.firstChild.style.textAlign = 'center';
		titleBox.firstChild.style.fontWeight = 'bold';
		
		var messageTxt = Z.Utils.getResource('ALERT_VALIDATELOCALSINGLEFILEVIEWING-MESSAGE') + thisViewer.imageFilename;
		var messageBox = Z.Utils.createTextElement(zvIntID, 'messageBox', messageTxt, messageW + 'px', messageH + 'px', messageL + 'px', messageT + 'px', textPad + 'px', 'none', '0px', true, 'verdana', '13px', 'none', null, 1, 'hidden', 'hidden', null);
		Z.FileAccessDisplay.appendChild(messageBox);
		messageBox.firstChild.style.textAlign = 'center';
		
		var inputCont = Z.Utils.createContainerElement(zvIntID, 'div', 'inputCont', 'inline-block', 'relative', 'auto', btnContW + 'px', btnContH + 'px', btnContL + 'px', btnContT + 'px', 'none', '0px', 'lightGrey', '0px', '0px', 'normal', null, true);
		var fileBtn = document.createElement('input');
		fileBtn.setAttribute('type', 'file');
		inputCont.appendChild(fileBtn);
		Z.FileAccessDisplay.appendChild(inputCont);
		Z.Utils.addEventListener(fileBtn, 'change', handleFileSelect);
	}
	
	function handleFileSelect (event) {
		Z.localFileData = event.target.files[0];
		Z.localFileSelected = true;
		Z.FileAccessDisplay.style.display = 'none';
		validateCallback('imageFileSelected');
		validateCallback('readyConfigureViewer');
	}

	function clearImageParameters () {
		thisViewer.imagePath = null;
		thisViewer.imagePath2 = null;
		thisViewer.parameters = null;
		thisViewer.xmlParametersPath = null;
		thisViewer.xmlParametersParsing = null;
		thisViewer.initialX = null;
		thisViewer.initialY = null;
		thisViewer.initialZ = null;
		thisViewer.minZ = null;
		thisViewer.maxZ = null;
		thisViewer.zoomAndPanInProgressID = null;
		thisViewer.geoCoordinatesPath = null;
		thisViewer.geoCoordinatesVisible = null;
		thisViewer.geoCoordinatesFolder = null;
		thisViewer.tour = false;
		thisViewer.tourPath = null;
		thisViewer.tourPlaying = null;
		thisViewer.tourStopping = false;
		thisViewer.hotspots = false;
		thisViewer.hotspotPath = null;
		thisViewer.hotspotFolder = null;
		thisViewer.annotations = false;
		thisViewer.annotationPath = null;
		thisViewer.annotationPanelVisible = null;
		thisViewer.annotationFolder = null;
		thisViewer.annotationJSONObject = null;
		thisViewer.annotationXMLText = null;
		thisViewer.labelIconsInternal = null;
		thisViewer.annotationsAddMultiple = null;
		thisViewer.annotationsAutoSave = null;
		thisViewer.annotationsAutoSaveImage = null;
		thisViewer.postingXML = false;
		thisViewer.postingImage = false;
		thisViewer.initialR = null;

		thisViewer.unitsPerImage = null;
		thisViewer.pixelsPerUnit = null;
		thisViewer.sourceMagnification = null;
		thisViewer.imageProperties = null;
		thisViewer.annotationPathProvided = false;
		thisViewer.imageSetPathProvided = false;
		thisViewer.slidePathProvided = false;
		thisViewer.tileSource = null;
		thisViewer.tileSourceMultiple = null;
		thisViewer.pffJPEGHeadersSeparate = false;
		thisViewer.focal = null;
		thisViewer.quality = null;

		if (!thisViewer.tracking) {
			thisViewer.markupMode = null;
			thisViewer.editMode = null;
			thisViewer.editAdmin = false;
			thisViewer.editing = null;
			thisViewer.labelMode = 'view';
			thisViewer.editModePrior = thisViewer.editMode;
		}

		thisViewer.sliderFocus = 'zoom';
		thisViewer.animation = false;
		thisViewer.animationPath = null;
		thisViewer.animationCount = 0;
		thisViewer.animationAxis = null;
		thisViewer.animator = null;
		thisViewer.animationFlip = null;
		thisViewer.slidestack = false;
		thisViewer.slidestackPath = null;

		thisViewer.imageSetHotspotPath = null;
		thisViewer.hotspotFileShared = false;
		thisViewer.imageSetAnnotationPath = null;
		thisViewer.annotationFileShared = false;
		thisViewer.imageW = null;
		thisViewer.imageH = null;
		thisViewer.imageD = null;
		thisViewer.imageCtrX = null;
		thisViewer.imageCtrY = null;
		thisViewer.imageX = 0;
		thisViewer.imageY = 0;
		thisViewer.imageZ = 0;
		thisViewer.imageR = 0;
		thisViewer.fitZ = null;
		thisViewer.fillZ = null;
		thisViewer.zooming = 'stop';
		thisViewer.panningX = 'stop';
		thisViewer.panningY = 'stop';
		thisViewer.rotating = 'stop';

		thisViewer.iiifInfoJSONObject =null;
		thisViewer.iiifIdentifier = null;
		thisViewer.iiifRegion = null;
		thisViewer.iiifSize = null;
		thisViewer.iiifRotation = null;
		thisViewer.iiifQuality = null;
		thisViewer.iiifFormat = null;
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::: ELEMENT & OBJECT FUNCTIONS :::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.clearComponent = function (component) {
		switch (component) {
			case thisViewer.Toolbar :
				thisViewer.Toolbar = null;
				Z.Utils.clearDisplay(thisViewer.ToolbarDisplay, thisViewer);
				thisViewer.toolbarVisible = null;
				thisViewer.toolbarBackgroundVisible = null;
				thisViewer.skinPath = null;
				thisViewer.sliderZoomVisible = null;
				thisViewer.logoVisible = null;
				thisViewer.minimizeVisible = null;
				thisViewer.zoomButtonsVisible = null;
				thisViewer.sliderVisible = null;
				thisViewer.panButtonsVisible = null;
				thisViewer.logoVisible = null;
				thisViewer.resetVisible = null;
				thisViewer.fullScreenVisible = null;
				thisViewer.tooltipsVisible = null;
				thisViewer.helpVisible = null;
				thisViewer.progressVisible = null;
				break;
			case thisViewer.Navigator :
				thisViewer.navigatorVisible = null;
				thisViewer.navigatorW = null;
				thisViewer.navigatorH = null;
				thisViewer.navigatorL = null;
				thisViewer.navigatorT = null;
				thisViewer.navigatorFit = null;
				thisViewer.navigatorRectangleColor = null;
				break;
			case thisViewer.Gallery :
				Z.Utils.clearDisplay(thisViewer.GalleryDisplay, thisViewer);
				thisViewer.Gallery = null;
				thisViewer.galleryVisible = null;
				thisViewer.galleryAutoShowHide = null;
				thisViewer.galleryW = null;
				thisViewer.galleryH = null;
				thisViewer.galleryM = null;
				thisViewer.galleryL = null;
				thisViewer.galleryT = null;
				thisViewer.galleryPosition = null;
				thisViewer.galleryRectangleColor = null;
				break;
			case thisViewer.Ruler :
				Z.Utils.clearDisplay(thisViewer.RulerDisplay, thisViewer);
				thisViewer.Ruler = null;
				thisViewer.rulerVisible = null;
				thisViewer.rulerListType = null;
				thisViewer.rulerW = null;
				thisViewer.rulerH = null;
				thisViewer.rulerL = null;
				thisViewer.rulerT = null;
				break;
		}
	}	

	// Determine if callback is set.
	this.verifyCallback = function (callbackEvent) {
		var callbackValidated = false;
		if (typeof thisViewer.callbacks !== 'undefined') {
			var callbacksTempArr = thisViewer.callbacks.slice(0);
			for (var i = 0, j = callbacksTempArr.length; i < j; i++) {
				var callback = callbacksTempArr[i];
				if (callback && callback.callbackEvent == callbackEvent && typeof callback === 'object' && typeof callback.callbackFunction === 'function') {
					callbackValidated = true;
				}
			}
		}
		return callbackValidated;
	}
	
	// Determine if callback is set.
	this.getCallbackFunction = function (callbackEvent) {
		var callbackFunction = null;
		if (typeof thisViewer.callbacks !== 'undefined') {
			var callbacksTempArr = thisViewer.callbacks.slice(0);
			for (var i = 0, j = callbacksTempArr.length; i < j; i++) {
				var callback = callbacksTempArr[i];
				if (callback && callback.callbackEvent == callbackEvent && typeof callback === 'object' && typeof callback.callbackFunction === 'function') {
					callbackFunction = callback.callbackFunction;
				}
			}
		}
		return callbackFunction;
	}

	// Timer permits completion of callback-related events such as mouseup during updateView.
	// Passing in array ensures multiple callbacks on same event will not be interfered with by clearCallback calls of any.
	this.validateCallback = function (callbackEvent) {
		validateCallback(callbackEvent);
	}
	
	function validateCallback (callbackEvent) {
		if (typeof thisViewer.callbacks === 'undefined') { thisViewer.callbacks = []; }
		var callbacksTempCopy = thisViewer.callbacks.slice(0);
		Z.Utils.functionCallWithDelay(function () { validateCallbackDelayed(callbackEvent, callbacksTempCopy); }, 10);
	}

	// For loop enables more than one function call to be assigned to a callback event.
	this.validateCallbackDelayed = function (callbackEvent, callbacksTempArr) {
		validateCallbackDelayed(callbackEvent, callbacksTempArr);
	}
	
	function validateCallbackDelayed (callbackEvent, callbacksTempArr) {
		for (var i = 0, j = callbacksTempArr.length; i < j; i++) {
			var callback = callbacksTempArr[i];

			// DEV NOTE: First condition needed due to asynchronous callbacks array deletions.
			if (callback && callback.callbackEvent == callbackEvent && typeof callback === 'object' && typeof callback.callbackFunction === 'function') {

				switch (callbackEvent) {
					case 'viewChanging' :
						callback.callbackFunction();
						break;
					case 'viewPanningGetCurrentCoordinates' :
						var currCoords = thisViewer.Viewport.getCoordinates();
						callback.callbackFunction(currCoords);
						break;
					case 'viewZoomingGetCurrentZoom' :
						var currentZ = thisViewer.Viewport.getZoom();
						callback.callbackFunction(currentZ);
						break;
					case 'viewChangingGetCurrentCoordinatesFull' :
						var currCoordsFull = thisViewer.Viewport.getCoordinatesFull();
						callback.callbackFunction(currCoordsFull);
						break;
					case 'viewUpdateCompleteGetLabelIDs' :
						var labelIDsInView = thisViewer.Viewport.getLabelIDsInCurrentView(false, true, true);
						callback.callbackFunction(labelIDsInView);
						break;
					case 'viewUpdateCompleteGetLabelInternalIDs' :
						var labelInternalIDsInView = thisViewer.Viewport.getLabelIDsInCurrentView(true, true, true);
						callback.callbackFunction(labelInternalIDsInView);
						break;
					case 'labelSavedGetJSONObject' :
						var labelCurr = thisViewer.Viewport.getCurrentLabel();
						if (labelCurr) {
							var labelIDCurrent = labelCurr.internalID;
							var jsonLabelObject = thisViewer.Viewport.getLabelJSONObject(labelIDCurrent, true);
							callback.callbackFunction(jsonLabelObject);
						}
						break;
					case 'labelCreatedGetInternalID' :
						if (thisViewer.Viewport && thisViewer.Viewport.getStatus('XMLParsedViewport')) {
							var labelCurr = thisViewer.Viewport.getCurrentLabel();
							if (labelCurr) {
								var labelIDCurrent = labelCurr.internalID;
								callback.callbackFunction(labelIDCurrent);
							}
						}
						break;						
					case 'labelDrawnGetIDs' :
						if (thisViewer.Viewport) {
							var labelCurr = thisViewer.Viewport.getCurrentLabel();
							if (labelCurr) {
								callback.callbackFunction(labelCurr.id, labelCurr.internalID);
							}						
						}
						break;		
					case 'labelSelectedInViewportGetIDs' :
						if (thisViewer.Viewport) {
							var labelCurr = thisViewer.Viewport.getCurrentLabel();
							if (labelCurr) {
								callback.callbackFunction(labelCurr.id, labelCurr.internalID);
							}
						}
						break;
					case 'currentLabelChangedGetID' :
						if (thisViewer.Viewport) {
							var labelCurr = thisViewer.Viewport.getCurrentLabel();
							if (labelCurr) {
								callback.callbackFunction(labelCurr.id, labelCurr.internalID);
							}
						}
						break;
					default :
						callback.callbackFunction();
				}
			}
		}
		Z.Utils.arrayClear(callbacksTempArr);
	}
	
	
	
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::: DEBUGGING & MESSAGING FUNCTIONS ::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	function configureHelpDisplay () {
		// Calculate help display dimensions, position, and presentation.
		var marginW = 80, marginH = 80;
		var mdW = thisViewer.helpW;
		var mdH = thisViewer.helpH;
		if (mdW >= thisViewer.viewerW) {
			mdW = thisViewer.viewerW - marginW;
			marginW -= 40;
		}
		if (mdH >= thisViewer.viewerH) {
			mdH = thisViewer.viewerH - marginH;
			marginH -= 40;
		}
		var mdL = (thisViewer.helpL) ? thisViewer.helpL : (thisViewer.viewerW - mdW) / 2;
		var mdT = (thisViewer.helpT) ? thisViewer.helpT : (thisViewer.viewerH - mdH) / 2;
		var scrnColor = Z.Utils.getResource('UI_HELPSCREENCOLOR');
		var btnColor = Z.Utils.getResource('UI_HELPBUTTONCOLOR');

		// Create help display.
		Z.HelpDisplay = Z.Utils.createContainerElement(zvIntID, 'div', 'HelpDisplay', 'inline-block', 'absolute', 'hidden', mdW + 'px', mdH + 'px', mdL + 'px', mdT + 'px', 'solid', '1px', scrnColor, '0px', '0px', 'normal', null, true);
		thisViewer.ViewerDisplay.appendChild(Z.HelpDisplay);
		var helpTextBox = Z.Utils.createContainerElement(zvIntID, 'div', 'helpTextBox', 'inline-block', 'absolute', 'auto', (mdW - 50) + 'px', (mdH - 74) + 'px', '4px', '4px', 'solid', '1px', 'white', '0px', '20px', null);
		helpTextBox.style.overflowY = 'auto';
		// Alternative implementation: Text rather than HTML content.
		//var helpTextBox = Z.Utils.createTextElement(zvIntID, 'helpTextBox', '', (mdW - 18) + 'px', (mdH - 40) + 'px', '4px', '4px', '4px', 'solid', '1px', true, 'verdana', '12px', 'none', null, 1, 'auto', 'auto', null);
		Z.HelpDisplay.appendChild(helpTextBox);
		Z.help = Z.Utils.getElementOfViewerById(zvIntID, 'helpTextBox');

		// Ensure proper z-ordering of Viewer elements.
		Z.HelpDisplay.style.zIndex = (thisViewer.baseZIndex + 26).toString();

		// Configure and add display buttons.
		var btnW = 56;
		var btnH = 18;
		var dvdrW = 10;
		var dvdrH = 5;
		var btnL = mdW;
		var btnT = mdH - btnH - dvdrH;
		var btnTxt;

		btnL -= (btnW + dvdrW);
		btnTxt = Z.Utils.getResource('UI_HELPOKBUTTONTEXT');
		var buttonHelpOk = new Z.Utils.Button(zvIntID, 'buttonHelpOk', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', helpOkButtonHandler, 'TIP_HELPOK', 'solid', '1px', btnColor, '0px', '0px', null, null, thisViewer.tooltipsVisible);
		Z.HelpDisplay.appendChild(buttonHelpOk.elmt);
	}

	function helpOkButtonHandler (event) {
		hideHelp();
		return true;
	}

	this.showHelp = function (helpContent) {
		// Create help display on first use.
		if (!Z.HelpDisplay) { configureHelpDisplay(); }

		if (Z.help) {
			if (!thisViewer.helpCustom) {
				Z.help.innerHTML = unescape(helpContent);
			} else {
				// If zHelpPath present use previously loaded custom help page in place of default internal content.
				Z.help.innerHTML = thisViewer.helpContent;
			}

			Z.HelpDisplay.style.display = 'inline-block';

			var buttonHelpOk = Z.Utils.getElementOfViewerById(zvIntID, 'buttonHelpOk');
			buttonHelpOk.style.display = 'inline-block';

			// Alternative implementation: Text rather than HTML content.
			//Z.help.value = helpContent;
			//var mTB = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-helpBox');
			//if (mTB) { mTB.firstChild.style.textAlign = 'left'; }
		}
	}

	function hideHelp () {
		Z.HelpDisplay.style.display = 'none';
	}
	
	function configureMessageDisplay () {
		// Calculate message display dimensions, position, and presentation.
		var mdW = parseInt(Z.Utils.getResource('UI_MESSAGEDISPLAYWIDTH'), 10);
		var mdH = parseInt(Z.Utils.getResource('UI_MESSAGEDISPLAYHEIGHT'), 10);

		var displayCoords = getMessageDisplayCoords('6', mdW, thisViewer.viewerW, thisViewer.viewerH); // thisViewer.viewerW allows for toolbar height if static in viewer display area.

		var scrnColor = Z.Utils.getResource('DEFAULT_MESSAGESCREENCOLOR');
		var btnColor = Z.Utils.getResource('DEFAULT_MESSAGEBUTTONCOLOR');

		// Create message display.
		thisViewer.MessageDisplay = Z.Utils.createContainerElement(zvIntID, 'div', 'MessageDisplay', 'inline-block', 'absolute', 'auto', mdW + 'px', mdH + 'px', displayCoords.x + 'px', displayCoords.y + 'px', 'solid', '1px', scrnColor, '0px', '0px', 'normal', null, true);
		thisViewer.ViewerDisplay.appendChild(thisViewer.MessageDisplay);

		// Ensure proper z-ordering of Viewer elements.
		thisViewer.MessageDisplay.style.zIndex = (thisViewer.baseZIndex + 30).toString();

		var messageBox = Z.Utils.createTextElement(zvIntID, 'messageBox', '', (mdW - 18) + 'px', (mdH - 40) + 'px', '4px', '4px', '4px', 'solid', '1px', true, 'verdana', '12px', 'none', null, 1, 'auto', 'auto', null);
		thisViewer.MessageDisplay.appendChild(messageBox);
		thisViewer.messages = Z.Utils.getElementOfViewerById(zvIntID, 'messageBox');

		// Configure and add display buttons.
		var btnW = 56;
		var btnH = 18;
		var dvdrW = 10;
		var dvdrH = 5;
		var btnL = mdW;
		var btnT = mdH - btnH - dvdrH;
		var btnTxt;

		// DEV NOTE: Cancel option not required for current feature set.
		/* btnL -= (btnW + dvdrW);
		btnTxt = Z.Utils.getResource('UI_MESSAGECANCELBUTTONTEXT');
		var buttonMessageCancel = new Z.Utils.Button(zvIntID, 'buttonMessageCancel', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', messageCancelButtonHandler, 'TIP_MESSAGECANCEL', 'solid', '1px', btnColor, '0px', '0px', null, null, thisViewer.tooltipsVisible);
		thisViewer.MessageDisplay.appendChild(buttonMessageCancel.elmt);
		*/

		btnL -= (btnW + dvdrW);
		btnTxt = Z.Utils.getResource('UI_MESSAGEOKBUTTONTEXT');
		var buttonMessageOk = new Z.Utils.Button(zvIntID, 'buttonMessageOk', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', messageOkButtonHandler, 'TIP_MESSAGEOK', 'solid', '1px', btnColor, '0px', '0px', null, null, thisViewer.tooltipsVisible);
		thisViewer.MessageDisplay.appendChild(buttonMessageOk.elmt);
	}

	function getMessageDisplayCoords (position, displayW, viewerW, viewerH) {
		//Message display positioning: 1 top-left, 2 top-center, 3 top-right, 4 bottom right, 5 bottom-center, 6 bottom left.
		var displayX, displayY;
		var margin = 40;
		switch (position) {
			case '1':
				displayX = margin;
				displayY = margin;
				break;
			case '2':
				displayX = viewerW / 2 - displayW / 2;
				displayY = margin;
				break;
			case '3':
				displayX = viewerW - displayW - margin * 2;
				displayY = margin;
				break;
			case '4':
				displayX = viewerW - displayW - margin;
				if (thisViewer.toolbarVisible > 0 && thisViewer.toolbarVisible != 8) {
					displayY = viewerH - margin * 3;
				} else {
					displayY = viewerH - margin * 2;
				}
				break;
			case '5':
				displayX = viewerW / 2 - displayW / 2;
				if (thisViewer.toolbarVisible > 0 && thisViewer.toolbarVisible != 8) {
					displayY = viewerH - margin * 3;
				} else {
					displayY = viewerH - margin * 2;
				}
				break;
			case '6':
				displayX = margin;
				if (thisViewer.toolbarVisible > 0 && thisViewer.toolbarVisible != 8) {
					displayY = viewerH - margin * 3;
				} else {
					displayY = viewerH - margin * 2;
				}
				break;
			default:
				displayX = viewerW - displayW;
				displayY = margin;
		}
		return new Z.Utils.Point(displayX, displayY);
	}

	function messageOkButtonHandler (event) {
		hideMessage();
		if (thisViewer.Viewport && thisViewer.coordinatesVisible) { thisViewer.Viewport.setCoordinatesDisplayVisibility(false); }
		return true;
	}

	function messageCancelButtonHandler (event) {
		// DEV NOTE: Cancel option not required by current feature set.
		hideMessage();
		return false;
	}

	this.showMessage = function (messageText, button, displayTime, textAlign, once, position) {
		showMessage(messageText, button, displayTime, textAlign, once, position);
	}
	
	function showMessage (messageText, button, displayTime, textAlign, once, position) {
		// Parameter zMessagesVisible permits disabling display.
		if (thisViewer.messagesVisible) {

			// Create message display on first use and clear any pending message timers prior to new use.
			if (!thisViewer.MessageDisplay) { configureMessageDisplay(); }

			//Message display positioning: 1 top-left, 2 top-center, 3 top-right, 4 bottom right, 5 bottom-center, 6 bottom left.
			if (typeof position === 'undefined' || position === null) { position = '6'; }
			var mdW = parseInt(Z.Utils.getResource('UI_MESSAGEDISPLAYWIDTH'), 10);
			var displayCoords = getMessageDisplayCoords(position, mdW, thisViewer.viewerW, thisViewer.viewerH); // thisViewer.viewerW allows for toolbar height if static in viewer display area.
			thisViewer.MessageDisplay.style.left = displayCoords.x + 'px';
			thisViewer.MessageDisplay.style.top = displayCoords.y + 'px';

			if (thisViewer.MessageDisplay.messageTimer) { window.clearTimeout(thisViewer.MessageDisplay.messageTimer); }

			// Record and check prior displays if message to be displayed only once.
			var displayOK = true;
			if (once) {
				if (Z.Utils.arrayIndexOf(thisViewer.messageDisplayList, messageText) != -1) {
					displayOK = false;
				} else {
					thisViewer.messageDisplayList[thisViewer.messageDisplayList.length] = messageText;
				}
			}
			if (displayOK) {
				// Show message display.
				if (thisViewer.messages) { thisViewer.messages.value = messageText; }
				thisViewer.MessageDisplay.style.display = 'inline-block';
				if (typeof textAlign !== 'undefined' && textAlign !== null) {
					var mTB = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-messageBox');
					if (mTB) { mTB.firstChild.style.textAlign = textAlign; }
				}

				// Add buttons if specified.
				var buttonMessageOk = Z.Utils.getElementOfViewerById(zvIntID, 'buttonMessageOk');
				var mdH = parseInt(Z.Utils.getResource('UI_MESSAGEDISPLAYHEIGHT'), 10);
				if (typeof button !== 'undefined' && button !== null && button) {
					buttonMessageOk.style.display = 'inline-block';
					thisViewer.MessageDisplay.style.height = mdH + 'px';
				} else {
					buttonMessageOk.style.display = 'none';
					thisViewer.MessageDisplay.style.height = (mdH - 22) + 'px';
				}

				// Automatically hide message if display time specified.
				if (typeof displayTime !== 'undefined' && displayTime !== null && !isNaN(displayTime)) {
					if (typeof thisViewer.MessageDisplay.messageTimer !== 'undefined' && thisViewer.MessageDisplay.messageTimer !== null) { window.clearTimeout(thisViewer.MessageDisplay.messageTimer); }
					if (typeof displayTime === 'undefined' || displayTime === null) { displayTime = 3000; }
					thisViewer.MessageDisplay.messageTimer = window.setTimeout(hideMessageTimerHandler, displayTime);
				}
			}
		}
	}

	function getMessage () {
		var messageText = '';
		if (thisViewer.messages && Z.Utils.stringValidate(thisViewer.messages.value)) {
			messageText = thisViewer.messages.value;
		}
		return messageText;
	}

	this.hideMessage = function () {
		hideMessage();
	}

	function hideMessage () {
		if (thisViewer.MessageDisplay) {
			thisViewer.MessageDisplay.style.display = 'none';
		}
	}

	function hideMessageTimerHandler () {
		if (thisViewer.MessageDisplay.messageTimer) {
			window.clearTimeout(thisViewer.MessageDisplay.messageTimer);
			thisViewer.MessageDisplay.messageTimer = null;
		}
		thisViewer.hideMessage();
	}

	function uploadProgress (event) {
		var messageText = Z.saveImageMessage;
		if (event.lengthComputable) {
			var percentComplete = Math.round(event.loaded * 100 / event.total);
			messageText += percentComplete.toString() + '%';
		} else {
			messageText += Z.Utils.getResource('ERROR_IMAGESAVEUNABLETOCOMPUTEPROGRESS');
		}
		thisViewer.showMessage(messageText, false, 'none', 'center');
	}

	function trace (text, blankLineBefore, blankLineAfter) {
		var preLines = (blankLineBefore) ? '\n' : '';
		var postLines = (blankLineAfter) ? '\n\n' : '\n';
		if (!thisViewer.TraceDisplay) { configureTraceDisplay(); }
		if (thisViewer.traces) {
			thisViewer.traces.value += preLines + text + postLines;
			if (thisViewer.debug == 2) { thisViewer.traces.scrollTop = thisViewer.traces.scrollHeight; }
		}
	}

	function traceTileStatus (required, cached, requested, loaded, displayed, waiting) {
		if (!(trTS && tcTS && trqTS && tlTS && tdTS && twTS)) {
			var trTS = Z.Utils.getElementOfViewerById(zvIntID, 'tilesRequiredTextElement');
			var tcTS = Z.Utils.getElementOfViewerById(zvIntID, 'tilesCachedTextElement');
			var trqTS = Z.Utils.getElementOfViewerById(zvIntID, 'tilesRequestedTextElement');
			var tlTS = Z.Utils.getElementOfViewerById(zvIntID, 'tilesLoadedTextElement');
			var tdTS = Z.Utils.getElementOfViewerById(zvIntID, 'tilesDisplayedTextElement');
			var twTS = Z.Utils.getElementOfViewerById(zvIntID, 'tilesWaitingTextElement');
		}
		if (trTS && tcTS && trqTS && tlTS && tdTS && twTS) {
			if (typeof required !== 'undefined' && required !== null) {
				trTS.value = required.toString();
			}
			if (typeof cached !== 'undefined' && cached !== null) {
				tcTS.value = cached.toString();
			}
			if (typeof requested !== 'undefined' && requested !== null) {
				trqTS.value = requested.toString();
			}
			if (typeof loaded !== 'undefined' && loaded !== null) {
				tlTS.value = loaded.toString();
			}
			if (typeof displayed !== 'undefined' && displayed !== null) {
				tdTS.value = displayed.toString();
			}
			if (typeof waiting !== 'undefined' && waiting !== null) {
				twTS.value = waiting.toString();
			}
		}
	}

	function traceTileSpeed (tmElpsd, loadsPerSec) {
		if (!(tteTS && tpsTS)) {
			var tteTS = Z.Utils.getElementOfViewerById(zvIntID, 'tilesTimeElapsedTextElement');
			var tpsTS = Z.Utils.getElementOfViewerById(zvIntID, 'tilesPerSecondTextElement');
		}
		if (tteTS && tpsTS) {
			if (typeof tmElpsd !== 'undefined' && tmElpsd !== null) {
				tteTS.value = tmElpsd.toString();
			}
			if (typeof loadsPerSec !== 'undefined' && loadsPerSec !== null) {
				tpsTS.value = Math.round(loadsPerSec).toString();
			}
		}
	}

	precacheBackfillTilesDelayed = function () {
		for (var i = 0, j = thisViewer.imageSetLength; i < j; i++) {
			var vpTest = thisViewer['Viewport' + i.toString()];
			if (!vpTest.getStatus('backfillPrecachedViewport')) {
				vpTest.precacheBackfillTiles(true);
			}
		}
	}
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::: EVENT FUNCTIONS ::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Handle keyboard, mouse, mousewheel, and touch events that are not Viewport-specific.
	// Mousewheel handler added here plus DOMMouseScroll added in addEventListener function.
	function initializeViewerEventListeners () {
	
		// Enable key events if first or only Viewer. Reset on mouse-over and mouse-out.
		initializeViewerKeyEventListeners(thisViewer.viewerInternalID == 0 && Z.viewerCounter == 1);
		
		Z.Utils.addEventListener(thisViewer.ViewerDisplay, 'mouseover', viewerEventsHandler);
		Z.Utils.addEventListener(thisViewer.ViewerDisplay, 'mouseout', viewerEventsHandler);
		Z.Utils.addEventListener(thisViewer.ViewerDisplay, 'mousemove', Z.Utils.preventDefault);
		Z.Utils.addEventListener(thisViewer.ViewerDisplay, 'mousewheel', viewerEventsHandler);
		
		// If mousewheel enabled for zoom or image set navigation, block default mousewheel page scrolling.
		if (thisViewer.mouseWheel > 0) { Z.Utils.addEventListener(thisViewer.ViewerDisplay, 'mousewheel', Z.Utils.preventDefault); }
		
		initializeOrientationChangeHandler();
		if (thisViewer.autoResize) { Z.Utils.addEventListener(window, 'resize', thisViewer.viewerEventsHandler); }

		// If tracking, prevent arrow keys from scrolling page because arrow keys are used for guided navigation by cell increments.
		if (thisViewer.tracking) { initializeViewerKeyDefaultListeners(true); }

		// DEV NOTE: The following line prevents click-drag out of Viewer from selecting external text
		// in Safari, however, it disables all lists (hotspot, tour, slide, label). Working on alternative.
		// Z.Utils.addEventListener(thisViewer.ViewerDisplay, 'mousedown', Z.Utils.preventDefault);
	}

	// The following handler assignment approach is necessary for iOS to properly respond. The test for a necessary
	// delay is required because Safari does not have access to the body tag when JavaScript in the head tag is loading.
	function initializeOrientationChangeHandler () {
		if (document.getElementsByTagName('body')) {
			document.getElementsByTagName('body')[0].onorientationchange = orientationChangeHandler;
		} else {
			var bodyOrientationHandlerTimer = window.setTimeout(initializeOrientationChangeHandler, 100);
		}
	}

	function orientationChangeHandler (event) {
		if (!thisViewer.interactive) { return; }
		if (thisViewer.fullView) {
			if (thisViewer.Toolbar) {
				if (thisViewer.toolbarAutoShowHide) { thisViewer.Toolbar.show(false); }
				if (thisViewer.annotations && (thisViewer.annotationPanelVisible == 2 || thisViewer.annotationPanelVisible == 3)) { thisViewer.Toolbar.setVisibilityAnnotationPanel(false); }
				if (thisViewer.tracking && (thisViewer.trackingPanelVisible == 2 || thisViewer.trackingPanelVisible == 3)) { thisViewer.Toolbar.setVisibilityTrackingPanel(false); }
				if (thisViewer.userPanelVisible == 2 || thisViewer.trackingPanelVisible == 3) { thisViewer.Toolbar.setVisibilityUserPanel(false); }
			}
			if (thisViewer.Navigator && thisViewer.navigatorVisible > 1) {
				thisViewer.Navigator.setVisibility(false);
				if (thisViewer.comparison && thisViewer.Navigator2) { thisViewer.Navigator2.setVisibility(false); }
			}
			if (thisViewer.Gallery && thisViewer.galleryAutoShowHide) { thisViewer.Gallery.setVisibility(false); }

			if (thisViewer.Viewport) {
				thisViewer.Viewport.toggleFullViewMode(false);
				thisViewer.Viewport.toggleFullViewMode(true);
			}

			if (thisViewer.Gallery && thisViewer.galleryAutoShowHide) { thisViewer.Gallery.setVisibility(true); }
			if (thisViewer.Navigator && thisViewer.navigatorVisible > 1) {
				thisViewer.Navigator.setVisibility(true);
				if (thisViewer.comparison && thisViewer.Navigator2) { thisViewer.Navigator2.setVisibility(true); }
			}
			if (thisViewer.Toolbar) {
				if (thisViewer.annotations && (thisViewer.annotationPanelVisible == 2 || thisViewer.annotationPanelVisible == 3)) { thisViewer.Toolbar.setVisibilityAnnotationPanel(true); }
				if (thisViewer.tracking && (thisViewer.trackingPanelVisible == 2 || thisViewer.trackingPanelVisible == 3)) { thisViewer.Toolbar.setVisibilityTrackingPanel(true); }
				if (thisViewer.userPanelVisible == 2 || thisViewer.trackingPanelVisible == 3) { thisViewer.Toolbar.setVisibilityUserPanel(true); }
				if (thisViewer.toolbarAutoShowHide) { thisViewer.Toolbar.show(true); }
			}
		}
	}
	
	this.initializeViewerKeyEventListeners = function (enable) {
		initializeViewerKeyEventListeners(enable);
	}
	
	function initializeViewerKeyEventListeners (enable) {
		if (enable) {
			Z.Utils.addEventListener(document, 'keydown', keyEventsHandler);
			Z.Utils.addEventListener(document, 'keyup', keyEventsHandler);
		} else {
			Z.Utils.removeEventListener(document, 'keydown', keyEventsHandler);
			Z.Utils.removeEventListener(document, 'keyup', keyEventsHandler);
		}
	}

	function keyEventsHandler (event) {
		// Disallow keyboard control if parameters require or if focus is on text field, in Viewer (annotation panel) or in page.
		if (!thisViewer.interactive || !thisViewer.keys || document.activeElement.tagName == 'INPUT' || document.activeElement.tagName == 'TEXTAREA') {
			return;
		}

		var event = Z.Utils.event(event);
		var isAltKey = event.altKey;

		// Prevent conflicting zoom-and-pan function calls. Must not react to alt key release
		// in order to support alt-click zoom-to-100 and alt-dbl-click zoom-to-zoom-to-fit features.
		if (event.keyCode != 18 && !event.altKey) {
			thisViewer.viewportCurrent.zoomAndPanAllStop(true, true);
			if (thisViewer.maskingSelection) { thisViewer.viewportCurrent.clearLabelMask(); }
		}

		// Handle key events.
		if (event) {
			var eventType = event.type;
			var kc = event.keyCode;
			if (eventType == 'keydown') {
				thisViewer.keyIsDown = true;
				switch (kc) {
					case 90: // z
						thisViewer.viewportCurrent.zoom('out');
						break;
					case 17: // control
						thisViewer.viewportCurrent.zoom('out');
						break;
					case 65: // a
						thisViewer.viewportCurrent.zoom('in');
						break;
					case 16: // shift
						thisViewer.viewportCurrent.zoom('in');
						break;
					case 37: // left arrow
						if (!thisViewer.tracking && !thisViewer.animation || thisViewer.viewportCurrent.getZoom() != thisViewer.minZ) {
							thisViewer.viewportCurrent.pan('left');
						} else if (thisViewer.imageSet)  {
							thisViewer.viewportPrior();
						}
						break;
					case 38: // up arrow
						if (!thisViewer.tracking && !thisViewer.animation || thisViewer.viewportCurrent.getZoom() != thisViewer.minZ) {
							thisViewer.viewportCurrent.pan('up');
						} else if (thisViewer.imageSet)  {
							thisViewer.viewportNext();
						}
						break;
					case 40: // down arrow
						if (!thisViewer.tracking && !thisViewer.animation || thisViewer.viewportCurrent.getZoom() != thisViewer.minZ) {
							thisViewer.viewportCurrent.pan('down');
						} else if (thisViewer.imageSet) {
							thisViewer.viewportPrior();
						}
						break;
					case 39: // right arrow
						if (!thisViewer.tracking && !thisViewer.animation || thisViewer.viewportCurrent.getZoom() != thisViewer.minZ) {
							thisViewer.viewportCurrent.pan('right');
						} else if (thisViewer.imageSet) {
							thisViewer.viewportNext();
						}
						break;
					case 27: // escape
						if (!thisViewer.fullView) {
							thisViewer.viewportCurrent.reset();
						} else {
							thisViewer.viewportCurrent.toggleFullViewMode(false);
						}
						break;
					case 190: // '>' ('.')
						if (thisViewer.rotationVisible) { thisViewer.viewportCurrent.rotate('clockwise', isAltKey); }
						break;
					case 188: // '<'  (',')
						if (thisViewer.rotationVisible) { thisViewer.viewportCurrent.rotate('counterwise', isAltKey); }
						break;

					case 33: // page up
						 if (thisViewer.imageSet && !thisViewer.overlays) { thisViewer.viewportNext(); }
						break;
					case 34: // page down
						 if (thisViewer.imageSet && !thisViewer.overlays) { thisViewer.viewportPrior(); }
						break;
				}

				if (thisViewer.imageSet && (kc == 33 || kc == 34)) {
					if (event.preventDefault) {
						event.preventDefault();
					} else {
						event.returnValue = false;
					}
				}

			} else if (eventType == 'keyup') {
				thisViewer.keyIsDown = false;
				if (kc == 90 || kc == 17 || kc == 65 || kc == 16) {  // z, ctrl, a, and shift keys
					thisViewer.viewportCurrent.zoom('stop');
				} else if (kc == 37 || kc == 39 || kc == 38 || kc == 40) {  // Arrow keys
					if (!thisViewer.tracking) {
						if (kc == 37 || kc == 39) {
							thisViewer.viewportCurrent.pan('horizontalStop');
						} else if (kc == 38 || kc == 40) {
							thisViewer.viewportCurrent.pan('verticalStop');
						}
					} else {
						if (kc == 37) {
							thisViewer.viewportCurrent.goToNextCell('left');
						} else if (kc == 39) {
							thisViewer.viewportCurrent.goToNextCell('right');
						} else if (kc == 38) {
							thisViewer.viewportCurrent.goToNextCell('up');
						} else if (kc == 40) {
							thisViewer.viewportCurrent.goToNextCell('down');
						}
					}
				} else if (thisViewer.rotationVisible && (kc == 190 || kc == 188)) {
					thisViewer.viewportCurrent.rotate('stop');
				} else if (thisViewer.imageSet && (kc == 33 || kc == 34)) { // page up and page down keys.
					if (thisViewer.imageSet) { thisViewer.viewportCurrent.updateView(true); }
					if (event.preventDefault) {
						event.preventDefault();
					} else {
						event.returnValue = false;
					}
				} else if (kc == 32) { // space bar
					if (thisViewer.fullViewVisible || thisViewer.fullScreenVisible || thisViewer.fullPageVisible) {
						thisViewer.viewportCurrent.toggleFullViewMode();						
					}
				}
			}
		}
	}

	this.initializeViewerKeyDefaultListeners = function (enable) {
		initializeViewerKeyDefaultListeners(enable);
	}
	
	function initializeViewerKeyDefaultListeners (enable) {
		if (enable) {
			Z.Utils.addEventListener(document, 'keydown', Z.Utils.preventDefault);
			Z.Utils.addEventListener(document, 'keyup', Z.Utils.preventDefault);
		} else {
			Z.Utils.removeEventListener(document, 'keydown', Z.Utils.preventDefault);
			Z.Utils.removeEventListener(document, 'keyup', Z.Utils.preventDefault);
		}
	}

	this.viewerEventsHandler = function (event) {
		viewerEventsHandler(event);
	}

	function viewerEventsHandler (event) {
		// Handle all display events in this central event broker.
		var event = Z.Utils.event(event);
		var eventType = event.type;
		if (event && eventType) {
			var isRightMouseBtn = Z.Utils.isRightMouseButton(event);
			var isAltKey = event.altKey;

			// Prevent unwanted effects: interactivity or mouse-panning if parameters specify, zoom on right-click,
			// and page dragging in touch contexts. DEV NOTE: Timeout in next line is placeholder workaround for hotspot icon and caption anchor failure in IE.
			if ((eventType != 'mouseover' && eventType != 'mouseout' && !thisViewer.interactive)
				|| (eventType == 'mousedown' && (!thisViewer.interactive || (thisViewer.coordinatesVisible && isAltKey)))
				|| isRightMouseBtn) { return; }
			if (Z.touchSupport && !thisViewer.clickZoomAndPanBlock && eventType != 'touchmove' && eventType != 'gesturechange') {
				event.preventDefault();
			}

			// Handle event resetting.
			switch(eventType) {
				case 'mouseover' :
					// Prevent page scrolling using arrow keys. Also implemented in text element blur handler.
					if (!thisViewer.fullView && document.activeElement.tagName != 'TEXTAREA') { initializeViewerKeyDefaultListeners(true); }
					// Enable key interaction if mouse is over this viewer instance.
					if (Z.viewerCounter > 1) { initializeViewerKeyEventListeners(true); }
					break;
				case 'mouseout' :
					// If not tracking, disable prevention of page scrolling due to arrow keys. Also occurs in text element focus handler.
					if (!thisViewer.tracking) { initializeViewerKeyDefaultListeners(false); }
					// Disable key interaction if mouse is not over this viewer instance.
					if (Z.viewerCounter > 1) { initializeViewerKeyEventListeners(false); }
					break;
			}

			// Handle event actions.
			viewerEventsManager(event);

			if (eventType == 'mousedown' || eventType == 'mousemove') { return false; }
		}
	}

	function viewerEventsManager (event) {
		var event = Z.Utils.event(event);
		var eventType = event.type;
		if (event && eventType) {

			var touch, target, relatedTarget, mPt;
			target = Z.Utils.target(event);
			relatedTarget = Z.Utils.relatedTarget(event);
			if (eventType != 'resize') { mPt = Z.Utils.getMousePosition(event); }
			var isAltKey = event.altKey;

			// Standardize Firefox mouse wheel event.
			if (eventType == 'DOMMouseScroll') { eventType = 'mousewheel'; }

			// Implement actions.
			switch(eventType) {
				case 'mouseover' :
					// Block if moving within viewer display or subelements.
					var targetIsInViewer = Z.Utils.nodeIsInViewer(thisViewer.viewerInternalID, target);
					var relatedTargetIsInViewer = Z.Utils.nodeIsInViewer(thisViewer.viewerInternalID, relatedTarget);
					if (!(targetIsInViewer && relatedTargetIsInViewer)) {
						// Mouse-over bubbles from navigator or toolbar blocked by stop propagation handlers. Mouse-overs not
						// needed on return from outside viewer as components would be hidden if toolbar mode enables hiding.
						if (thisViewer.viewportCurrent) { thisViewer.viewportCurrent.showLists(true); }
						if (thisViewer.ToolbarDisplay && thisViewer.Toolbar && thisViewer.toolbarAutoShowHide) { thisViewer.Toolbar.show(true); }
						if (thisViewer.Navigator && thisViewer.navigatorVisible > 1) {
							thisViewer.Navigator.setVisibility(true);
							if (thisViewer.comparison && thisViewer.Navigator2) { thisViewer.Navigator2.setVisibility(true); }
						}
						if (thisViewer.Gallery && thisViewer.galleryAutoShowHide) { thisViewer.Gallery.setVisibility(true); }
						if (thisViewer.Ruler && thisViewer.rulerVisible > 1) { thisViewer.Ruler.setVisibility(true); }
						if (thisViewer.Toolbar) {
							if (thisViewer.annotations && (thisViewer.annotationPanelVisible == 2 || thisViewer.annotationPanelVisible == 3)) { thisViewer.Toolbar.setVisibilityAnnotationPanel(true); }
							if (thisViewer.tracking && (thisViewer.trackingPanelVisible == 2 || thisViewer.trackingPanelVisible == 3)) { thisViewer.Toolbar.setVisibilityTrackingPanel(true); }
							if (thisViewer.userPanelVisible == 2 || thisViewer.trackingPanelVisible == 3) { thisViewer.Toolbar.setVisibilityUserPanel(true); }
						}
						thisViewer.mouseOutDownPoint = null;
					}
					break;

				case 'mouseout' :
					var targetIsInViewer = Z.Utils.nodeIsInViewer(thisViewer.viewerInternalID, target);
					var relatedTargetIsInViewer = Z.Utils.nodeIsInViewer(thisViewer.viewerInternalID, relatedTarget);
					var listNavigation = (target == '[object HTMLSelectElement]' || target == '[object HTMLOptionElement]' || relatedTarget == '[object HTMLSelectElement]' || relatedTarget == '[object HTMLOptionElement]');

					// Block if moving within viewer display or subelements.
					if (!(targetIsInViewer && relatedTargetIsInViewer) && !listNavigation) {

						if (!thisViewer.mouseIsDown) {
							if (thisViewer.viewportCurrent) { thisViewer.viewportCurrent.showLists(false); }
							if (thisViewer.ToolbarDisplay && thisViewer.Toolbar && thisViewer.toolbarAutoShowHide) { thisViewer.Toolbar.show(false); }
							if (thisViewer.Navigator && thisViewer.navigatorVisible > 1) {
								thisViewer.Navigator.setVisibility(false);
								if (thisViewer.comparison && thisViewer.Navigator2) { thisViewer.Navigator2.setVisibility(false); }
							}
							if (thisViewer.Gallery && thisViewer.galleryAutoShowHide) { thisViewer.Gallery.setVisibility(false); }
							if (thisViewer.Ruler && thisViewer.rulerVisible > 1) { thisViewer.Ruler.setVisibility(false); }
							if (thisViewer.Toolbar) {
								if (thisViewer.annotations && (thisViewer.annotationPanelVisible == 2 || thisViewer.annotationPanelVisible == 3)) { thisViewer.Toolbar.setVisibilityAnnotationPanel(false); }
								if (thisViewer.tracking && (thisViewer.trackingPanelVisible == 2 || thisViewer.trackingPanelVisible == 3)) { thisViewer.Toolbar.setVisibilityTrackingPanel(false); }
								if (thisViewer.userPanelVisible == 2 || thisViewer.userPanelVisible == 3) { thisViewer.Toolbar.setVisibilityUserPanel(false); }
							}
						} else {
							thisViewer.mouseOutDownPoint = new Z.Utils.Point(mPt.x, mPt.y);
						}
					}
					break;

				case 'resize' :
					if (!autoResizeSkipTimer) { autoResizeSkipTimer = window.setTimeout(autoResizeSkipTimerHandler, autoResizeSkipDuration); }
					break;

				case 'mousewheel' :
					// Firefox 'DOMMouseScroll' mouse wheel event standardized at beginning of this function to unify handling under this 'mousewheel' case.
					// Convert mouse wheel motion to zoom step in or out, then call mouse wheel handler which will determine which slider has focus and also
					// create or refresh mousewheel completion timer.
					if (thisViewer.mouseWheel > 0) {
						var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
						thisViewer.viewportCurrent.mouseWheelHandler(delta, isAltKey);
					}
					break;
			}
		}
	}

	function autoResizeSkipTimerHandler () {
		if (autoResizeSkipTimer) {
			window.clearTimeout(autoResizeSkipTimer);
			autoResizeSkipTimer = null;
			autoResizeViewer();
		}
	}

	this.autoResizeViewer = function () {
		autoResizeViewer();
	}

	function autoResizeViewer () {
		if (!thisViewer.fullScreenEntering) {
			//DEV NOTE: workaround for Chrome/IE issue with thisViewer.viewerW & thisViewer.viewerH not reset during autoresize.
			var elem = document.getElementById(thisViewer.pageContainerID);
			thisViewer.viewerW = elem.offsetWidth;
			thisViewer.viewerH = elem.offsetHeight;

			var containerDims = Z.Utils.getContainerSize(thisViewer.pageContainer, thisViewer.ViewerDisplay);
			var newZoom = thisViewer.viewportCurrent.calculateZoomForResize(thisViewer.viewportCurrent.getZoom(), thisViewer.viewerW, thisViewer.viewerH, containerDims.x, containerDims.y);
			thisViewer.resizeViewer(containerDims.x, containerDims.y, newZoom);

			if (thisViewer.comparison) {
				var vpComparison = (thisViewer.viewportCurrent.getViewportID() == 0) ? thisViewer.Viewport1 : thisViewer.Viewport0;
				if (vpComparison) { vpComparison.syncViewportResize(thisViewer.imageX, thisViewer.imageY, thisViewer.imageZ, thisViewer.imageR); }
			} else if (thisViewer.overlays) {
				for (var i = 0, j = thisViewer.imageSetLength - 1; i < j; i++) {
					// -1 in line above prevents top VP from resetting itself in loop.
					thisViewer['Viewport' + i.toString()].syncViewportResize(thisViewer.imageX, thisViewer.imageY, thisViewer.imageZ, thisViewer.imageR);
				}
			}

		}
	}

	this.resizeViewer = function (w, h, z) {
		thisViewer.setSizeAndPosition(w, h, 0, 0, false);
		thisViewer.viewportCurrent.resizeViewport(thisViewer.imageX, thisViewer.imageY, z, thisViewer.imageR);

		if (thisViewer.comparison) {
			var vpComparison = (thisViewer.viewportCurrent.getViewportID() == 0) ? thisViewer.Viewport1 : thisViewer.Viewport0;
			if (vpComparison) {
				vpComparison.setSizeAndPosition(w, h, 0, 0, false);
				vpComparison.resizeViewport(thisViewer.imageX, thisViewer.imageY, z, thisViewer.imageR);
			}
		}
	}

	this.mouseWheelCompleteHandler = function (event) {
		thisViewer.mouseWheelIsDown = false;
		if (thisViewer.mouseWheelCompleteTimer) {
			window.clearTimeout(thisViewer.mouseWheelCompleteTimer);
			thisViewer.mouseWheelCompleteTimer = null;
			thisViewer.zooming = 'stop';
			thisViewer.viewportCurrent.updateView(true);
		}
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: VIEWPORT FUNCTIONS ::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	function ZoomifyViewport (vpID, vpImgPath, vpAnnotPath, vpHotPath, vpTrackPath, vpImageListPath) {
		// The following viewer global variables are limited to viewport scope when viewing an imageSet.
		// thisViewer.imagePath, thisViewer.hotspotPath, thisViewer.hotspotFolder, thisViewer.annotationPath, thisViewer.annotationFolder, thisViewer.tileSource, thisViewer.imageW, thisViewer.imageH, thisViewer.imageX, thisViewer.imageY, thisViewer.imageZ, thisViewer.initialX, thisViewer.initialY, thisViewer.initialZ, thisViewer.minZ, thisViewer.maxZ.
		var hotspotPath, hotspotFolder, annotationPath, annotationFolder;
		var imageX = null, imageY = null, imageZ = null;
		var timeoutCounterHotspotsVisibilityByFilter = 0, timeoutCounterHotspotsVisibilityAll = 0;

		var viewportID = 0;
		if (typeof vpID !== 'undefined' && vpID !== null) { viewportID = vpID; }

		var imagePath;
		if (typeof vpImgPath !== 'undefined' && vpImgPath !== null) {
			imagePath = vpImgPath;
		} else {
			imagePath = thisViewer.imagePath;
		}

		// thisViewer.hotspotPath and thisViewer.hotspotFolder or thisViewer.annotationPath and thisViewer.annotationFolder and/or thisViewer.trackingPath and thisViewer.trackingFolder are set here if multiples for imageSet, otherwise set in setParameters.
		if (typeof vpHotPath === 'undefined' || vpHotPath === null) {
			hotspotPath = thisViewer.hotspotPath;
			hotspotFolder = thisViewer.hotspotPath;
		} else {
			hotspotPath = vpHotPath;
			hotspotFolder = hotspotPath;
			if (hotspotFolder.toLowerCase().substring(hotspotFolder.length - 4, hotspotFolder.length) == '.xml') {
				hotspotFolder = hotspotFolder.substring(0, hotspotFolder.lastIndexOf('/'));
			}
		}
		if (typeof vpAnnotPath === 'undefined' || vpAnnotPath === null) {
			annotationPath = thisViewer.annotationPath;
			annotationFolder = thisViewer.annotationFolder;
		} else {
			annotationPath = vpAnnotPath;
			annotationFolder = annotationPath;
			if (annotationFolder.toLowerCase().substring(annotationFolder.length - 4, annotationFolder.length) == '.xml') {
				annotationFolder = annotationFolder.substring(0, annotationFolder.lastIndexOf('/'));
			}
		}
		if (typeof vpTrackPath === 'undefined' || vpTrackPath === null) {
			trackingPath = thisViewer.trackingPath;
			trackingFolder = thisViewer.trackingFolder;
		} else {
			trackingPath = vpTrackPath;
			trackingFolder = trackingPath;
			if (trackingFolder.toLowerCase().substring(trackingFolder.length - 4, trackingFolder.length) == '.xml') {
				trackingFolder = trackingFolder.substring(0, trackingFolder.lastIndexOf('/'));
			}
		}
		if (typeof vpImageListPath === 'undefined' || vpImageListPath === null) {
			imageListPath = thisViewer.imageListPath;
			imageListFolder = thisViewer.imageListFolder;
		} else {
			imageListPath = vpImageListPath;
			imageListFolder = imageListPath;
			if (imageListFolder.toLowerCase().substring(imageListFolder.length - 4, imageListFolder.length) == '.xml') {
				imageListFolder = imageListFolder.substring(0, imageListFolder.lastIndexOf('/'));
			}
		}

		// Set Viewer globals that cause hotspot/annotation display to be created and annotations.xml file(s) is/are parsed and annotation panel is created.
		if (typeof hotspotPath !== 'undefined' && Z.Utils.stringValidate(hotspotPath)) {
			thisViewer.hotspots = true;
			thisViewer.annotationPathProvided = true;
			if (thisViewer.imageSet) { thisViewer.hotspotPath = 'multiple'; }
		} else if (typeof annotationPath !== 'undefined' && Z.Utils.stringValidate(annotationPath)) {
			thisViewer.annotations = true;
			thisViewer.annotationPathProvided = true;
			if (thisViewer.imageSet) { thisViewer.annotationPath = 'multiple'; }
		}

		// Set Viewer globals that cause tracking display and/or image list to be created.
		if (typeof trackingPath !== 'undefined' && Z.Utils.stringValidate(trackingPath)) {
			thisViewer.tracking = true;
			thisViewer.trackingPathProvided = true;
		}
		if (typeof imageListPath !== 'undefined' && Z.Utils.stringValidate(imageListPath)) {
			thisViewer.imageListPath = imageListPath;
			thisViewer.imageList = true;
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::::::::: INIT FUNCTIONS ::::::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		// Declare variables for viewport internal self-reference and for initialization completion.
		var thisViewport = this;
		var viewportStatus = [];

		// Set viewport constants and static variables from value in Zoomify Image Folder 'ImageProperties.xml' file or Zoomify Image File (PFF) header.
		var IMAGE_VERSION = -1;
		var HEADER_SIZE = 0
		var HEADER_SIZE_TOTAL = 0;
		var CHUNK_SIZE = (thisViewer.tileSource == 'ZoomifyZIFFile') ? parseInt(Z.Utils.getResource('DEFAULT_CHUNKSIZEZIF'), 10) : parseInt(Z.Utils.getResource('DEFAULT_CHUNKSIZEPFF'), 10);
		
		var OFFSET_CHUNK_SIZE_BYTES = CHUNK_SIZE * 8;
		var BC_CHUNK_SIZE_BYTES = CHUNK_SIZE * 4;
		var TILE_COUNT = 0;
		var TILES_PER_FOLDER = 256;
		var TILE_WIDTH = (thisViewer.tileSource != 'IIIFImageServer') ? parseInt(Z.Utils.getResource('DEFAULT_TILEW'), 10) : parseInt(Z.Utils.getResource('DEFAULT_TILEWIIIF'), 10);
		var TILE_HEIGHT = (thisViewer.tileSource != 'IIIFImageServer') ? parseInt(Z.Utils.getResource('DEFAULT_TILEH'), 10) : parseInt(Z.Utils.getResource('DEFAULT_TILEHIIIF'), 10);
		
		// Set other defaults and calculate other constants.
		var TIERS_SCALE_UP_MAX = parseFloat(Z.Utils.getResource('DEFAULT_TIERSMAXSCALEUP'));
		var TIERS_SCALE_DOWN_MAX = TIERS_SCALE_UP_MAX / 2;
		var TILES_CACHE_MAX = parseInt(Z.Utils.getResource('DEFAULT_TILESMAXCACHE'), 10);
		var tlbrOffset = (thisViewer.toolbarVisible == 1 && thisViewer.toolbarBackgroundVisible) ? thisViewer.toolbarH : 0;
		var MOUSECLICK_THRESHOLD_VIEWPORT = parseInt(Z.Utils.getResource('DEFAULT_MOUSECLICKTHRESHOLDVIEWPORT'), 10);
		var MOUSECLICK_THRESHOLD_TIME_VIEWPORT = parseInt(Z.Utils.getResource('DEFAULT_MOUSECLICKTHRESHOLDTIMEVIEWPORT'), 10);
		var TOUCHTAP_THRESHOLD_VIEWPORT = (Z.mobileDevice) ? parseInt(Z.Utils.getResource('DEFAULT_TOUCHTAPTHRESHOLDVIEWPORTMOBILE'), 10) : parseInt(Z.Utils.getResource('DEFAULT_TOUCHTAPTHRESHOLDVIEWPORT'), 10);
		
		var TOUCHTAP_THRESHOLD_TIME_VIEWPORT = parseInt(Z.Utils.getResource('DEFAULT_TOUCHTAPTHRESHOLDTIMEVIEWPORT'), 10);

		// Declare variables for viewport displays.
		var oversizeDisplay, oD, oS, oCtx;
		var comparisonMaskContainer, cmD, cmS;
		var viewportContainer, cD, cS;
		var viewportBackfillDisplay, bD, bS, bCtx;
		var viewportDisplay, vD, vS, vCtx;
		var transitionCanvas, tC, tS, tCtx;
		var watermarkDisplay, wD, wS;
		var hotspotDisplay, hD, hS, hotD, hotS, annD, annS;
		var drawingDisplay, dD, dS, dCtx;
		var editingDisplay, eD, eS, eCtx;
		var imageFilterCanvas, fC, fS, fCtx;
		var imageFilterBackfillCanvas, fbC, fbS, fbCtx;
		var trkD, trkS;
		var upD, upS;
		var lastPtX, lastPtY;
		var maskCanvas, mC, mS, mCtx;
		var savingDisplay, sD, sS, sCtx;

		// Create backfill, viewport, watermark, and hotspot displays within container that can be
		// dragged. Scaling occurs in display canvases directly or in tiles if in non-canvas browser.
		createDisplays(viewportID);

		// Support unconverted image viewing.
		var unconvertedImage;

		// Declare variables for ZIF and PFF offset and bytecount data.
		var tierTileOffsetsStart = [], tierTileOffsetsCount = [],  tierTileOffsetChunks = [], tierTileOffsetLast = [];  // ZIF support.
		var tierTileByteCountsStart = [], tierTileByteCountsCount = [], tierTileByteCountChunks = [], tierTileByteCountLast = [];  // ZIF support.
		var jpegHeaderArray = [], offsetChunks = [], offsetChunkBegins = [];

		// Declare variables and lists for viewport tiers and tiles.
		var tierCount = 1, tierCurrent = 0, tierBackfill = 0;
		var tierBackfillDynamic = false, tierBackfillOversize = 0, tierChanged = false;
		var tierScale, tierScalePrior, tierBackfillScale, tierBackfillOversizeScale;
		var tierWs = [], tierHs = [], tierWInTiles = [], tierHInTiles = [],  tierTileCounts = [];
		var tilesBackfillDisplayingNames = [], tilesBackfillLoadingNames = [], tilesBackfillCached = [], tilesBackfillCachedNames = [];
		var tilesInView = [], tilesInViewNames = [], tilesToLoadTotal = 0, tilesLoadingNamesLength = 0;
		var tilesBackfillToPrecache = 0, tilesBackfillToPrecacheLoaded = 0;
		var tilesBackfillToDisplay = 0, tilesBackfillInCache = 0, tilesBackfillRequested = 0, tilesBackfillLoaded = 0, tilesBackfillDisplayed = 0, tilesBackfillWaiting;
		var tilesToDisplay = 0, tilesInCache = 0, tilesRequested = 0, tilesLoaded = 0, tilesDisplayed = 0, tilesWaiting = 0, tilesTimeElapsed = 0, tileLoadsPerSecond = 0;
		var tilesDisplayingNames = [], tilesLoadingNames = [], tilesCached = [], tilesCachedNames = [], tilesCachedInView = [], tilesCachedInViewNames = [];
		var validateViewTimer = null, validateViewRetryCounter = 0;
		var validateViewRetryLimit = parseInt(Z.Utils.getResource('DEFAULT_VALIDATEVIEWRETRYLIMIT'), 10);
		var validateViewDelay = parseInt(Z.Utils.getResource('DEFAULT_VALIDATEVIEWRETRYDELAY'), 10);
		var tilesRetryNames = [], tilesRetryNamesChunks = [], tilesRetry = [], tilesBackfillRetryNames = [];
		var tileNetConnector = new Z.NetConnector(thisViewer);

		// Declare variables and lists for annotation and image saving.
		var drawLabelCounter;
		var fullImageTilesCachedNames = [], fullImageTilesCached = [];
		var fullImageTilesBackfillCachedNames = [], fullImageTilesBackfillCached = [];

		// Declare and set backfill threshold variables.
		var backfillTreshold3 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLTHRESHOLD3'), 10);
		var backfillDynamicAdjust = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLDYNAMICADJUST'), 10);
		var backfillTreshold2 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLTHRESHOLD2'), 10);
		var backfillChoice2 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLCHOICE2'), 10);
		var tierBackfillOversize = backfillChoice2;
		var backfillTreshold1 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLTHRESHOLD1'), 10);
		var backfillChoice1 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLCHOICE1'), 10);
		var backfillChoice0 = parseInt(Z.Utils.getResource('DEFAULT_BACKFILLCHOICE0'), 10);
		var backfillTresholdCached0 = null, backfillTresholdCached1 = null, backfillTresholdCached2 = null;

		// Declare variables for tile caching area and viewport.
		var panBufferUnconverted = (Z.mobileDevice) ? parseFloat(Z.Utils.getResource('DEFAULT_PANBUFFERUNCONVERTEDMOBILE')) : (thisViewer.rotationVisible) ? parseFloat(Z.Utils.getResource('DEFAULT_PANBUFFERUNCONVERTEDROTATION')) : parseFloat(Z.Utils.getResource('DEFAULT_PANBUFFERUNCONVERTED'));
		var panBufferStandard = (thisViewer.panBuffer !== null) ? thisViewer.panBuffer : parseFloat(Z.Utils.getResource('DEFAULT_PANBUFFER'));
		var PAN_BUFFER = (thisViewer.tileSource != 'unconverted') ? panBufferStandard : panBufferUnconverted;
		var BACKFILL_BUFFER = (Z.mobileDevice) ? parseFloat(Z.Utils.getResource('DEFAULT_BACKFILLBUFFERMOBILE')) : parseFloat(Z.Utils.getResource('DEFAULT_BACKFILLBUFFER'));
		var PAN_BUFFERSIZEMAXBROWSER = parseFloat(Z.Utils.getResource('DEFAULT_PAN_BUFFERSIZEMAXBROWSER'));
		var PAN_BUFFERSIZEMAXFIREFOX = parseFloat(Z.Utils.getResource('DEFAULT_PAN_BUFFERSIZEMAXFIREFOX'));
		var PAN_BUFFERSIZEMAXMOBILE = parseFloat(Z.Utils.getResource('DEFAULT_PAN_BUFFERSIZEMAXMOBILE'));
		var PAN_BUFFERSIZEMAXIMAGESET = parseFloat(Z.Utils.getResource('DEFAULT_PAN_BUFFERSIZEMAXIMAGESET'));
		var viewW, viewH, viewL, viewT, viewCtrX, viewCtrY;
		var displayW, displayH, displayCtrX, displayCtrY, displayL, displayR, displayT, displayB;
		var backfillW, backfillH, backfillCtrX, backfillCtrY, backfillL, backfillT;
			
		// Set initial values for tile selection and caching areas.			
		viewW = thisViewer.viewerW;
		viewH = thisViewer.viewerH;
		viewL = viewT = 0;

		// Reset viewport height and top if toolbar is visible, has a visible background, and is static (no hide/show or show/hide).
		viewH -= tlbrOffset;
		if (thisViewer.toolbarPosition == 0) { viewT += tlbrOffset; }		
		
		// Declare variables for viewport mouse support.
		var clickTimer = null;
		var dragPtStart, dragPtCurrent, dragTimeStart;
		var zoomifyEvent = null, zoomifyAction = null;
		var newLabelCounter = (Z.labelMode != 'counter') ? 1 : 0;

		// Declare variables for iOS gesture support.
		var touch = null, mPt = null, gestureInterval = null, gestureIntervalPercent = null, wasGesturing = false;
		var GESTURE_TEST_DURATION = parseInt(Z.Utils.getResource('DEFAULT_GESTURETESTDURATION'), 10);

		// Declare variables for non-iOS pinch support.
		var touch2 = null, mPt2 = null, pinchInterval = null, pinchDistanceStart, pinchIntervalPercent = null, wasPinching = false;
		var PINCH_TEST_DURATION = parseInt(Z.Utils.getResource('DEFAULT_PINCHTESTDURATION'), 10);

		// Declare viewport variables for continuous zoom-and-pan, smooth pan, and smooth animation functions.
		var panStepDistance = Math.round(parseFloat(Z.Utils.getResource('DEFAULT_PANSTEPDISTANCE')) * thisViewer.panSpeed);
		var panX = 0, panY = 0, smoothAnimationX = null, smoothAnimationY = null;
		var optimalMotionImages = parseInt(Z.Utils.getResource('DEFAULT_ANIMATIONOPTIMALMOTIONIMAGES'), 10);
		var optimalPositionDelta = parseInt(Z.Utils.getResource('DEFAULT_ANIMATIONOPTIMALPOSITIONDELTA'), 10);
		var smoothPanInterval = null, smoothPanStartPt = null, smoothPanDisplayStartPt = null, smoothPanMousePt = null;
		var smoothPanDeltaX = 0, smoothPanDeltaY = 0, smoothPanLastDeltaX = 0, smoothPanLastDeltaY = 0;
		var smoothPanGliding = null, smoothPanGlideX = null, smoothPanGlideY = null;
		var zoomStepDistance = (parseFloat(Z.Utils.getResource('DEFAULT_ZOOMSTEPDISTANCE')) * thisViewer.zoomSpeed);
		if (Z.mobileDevice) { zoomStepDistance /= 2; }
		var zoomVal = 0, zapTimer = null, zapStepCount = 0;
		var zapStepDuration = parseInt(Z.Utils.getResource('DEFAULT_ZAPSTEPDURATION'), 10);
		var zapTierCurrentZoomUnscaledX, zapTierCurrentZoomUnscaledY;
		var fadeInStep = (parseFloat(Z.Utils.getResource('DEFAULT_FADEINSTEP')) * thisViewer.fadeInSpeed);
		var fadeInInterval = null;
		var rotStepDegrees = parseInt(Z.Utils.getResource('DEFAULT_ROTATIONSTEPDEGREES'), 10);
		var rotStepDuration = parseInt(Z.Utils.getResource('DEFAULT_ROTATIONSTEPDURATION'), 10);
		var rotVal = 0, rotTimer = null;

		// Declare viewport variables for zoom-and-pan-to-view functions.
		var zaptvDuration = parseFloat(Z.Utils.getResource('DEFAULT_ZAPTVDURATION'));
		var zaptvSteps = parseFloat(Z.Utils.getResource('DEFAULT_ZAPTVSTEPS'));
		if (Z.mobileDevice) { zaptvSteps /= 2; }
		var zaptvTimer = null, zaptvStepCurrent = 0;

		// Declare viewport variables for full view, virtual pointer, crosshairs, and measurement, if needed.
		if (!thisViewer.fullScreenVisible && !thisViewer.fullPageVisible) {
			var fvBodW, fvBodH, fvBodO, fvDocO, fvContBC, fvContW, fvContH, fvContPos, fvContIdx;
			var buttonFullViewExitExternal, buttonFullViewExitExternalVisible;
		}
		if (thisViewer.crosshairsVisible) {
			drawCrosshairs(thisViewer.ViewerDisplay, viewW, viewH);
		}
		if (thisViewer.measureVisible || thisViewer.editMode !== null) {
			var measureLengthText = Z.Utils.getResource('UI_MEASURELENGTH');
			var measureLengthTotalText = Z.Utils.getResource('UI_MEASURELENGTHTOTAL');
			var measurePerimeterText = Z.Utils.getResource('UI_MEASUREPERIMETER');
			var measureAreaText = Z.Utils.getResource('UI_MEASUREAREA');
			var measureSquareText = Z.Utils.getResource('UI_MEASURESQUARE');
			var measureCaptionBackOpacity = parseFloat(Z.Utils.getResource('DEFAULT_MEASURECAPTIONBACKALPHA'));
			var measureCaptionFontSize = parseInt(Z.Utils.getResource('DEFAULT_MEASURECAPTIONFONTSIZE'), 10);
			var captionW = parseInt(Z.Utils.getResource('DEFAULT_MEASURECAPTIONWIDTH'), 10);
		}

		if (thisViewer.geoCoordinatesVisible) {
			var geoLeft, geoRight, geoTop, geoBottom;
			var geoLeftDec, geoTopDec, geoXSpan, geoYSpan;
		}

		// Declare viewport variables for filter functions.
		if (thisViewer.imageFilters) {
			var imageFilterTimer = null, imageFilterBackfillTimer = null, imageFilterRetryTimer = null;
			var imageFilterStatesConvolve = false;
			var imageFiltersApplied = [], tileImages = [];
			var cachedCanvas, cachedCanvasBackfill, cachedCanvasPrefilter, cachedCanvasFiltering;
			var imageFilterBrightnessValue = 0, imageFilterContrastValue = 0, imageFilterSharpnessValue = 0, imageFilterBlurrinessValue = 0, imageFilterColorRedValue = 0, imageFilterColorGreenValue = 0, imageFilterColorBlueValue = 0, imageFilterColorRedRangeValue = 0, imageFilterColorGreenRangeValue = 0, imageFilterColorBlueRangeValue = 0, imageFilterColorRedRangeValue2 = 0, imageFilterColorGreenRangeValue2 = 0, imageFilterColorBlueRangeValue2 = 0, imageFilterGammaValue = 0, imageFilterGammaRedValue = 0, imageFilterGammaGreenValue = 0, imageFilterGammaBlueValue = 0, imageFilterHueValue = 0, imageFilterSaturationValue = 0, imageFilterLightnessValue = 0, imageFilterWhiteBalanceValue = 0, imageFilterEqualizeValue = 0, imageFilterNoiseValue = 0, imageFilterGlowValue = 0;
		}

		// Prepare watermark variables and image if optional parameter set.
		if (thisViewer.watermarks) {
			var watermarkImage, watermarkAlpha;
			var watermarksX = [], watermarksY = [];
		}

		// Prepare image list variables if optional parameter set.
		if (thisViewer.imageList) {
			var imageCurrent, imageList, imageListPosition, imageListW, imageListSource;
			var imageListDP = [];
		}

		// Prepare tour variables if optional parameter set. Hotspot variables below also prepared because hotspotPath set to tourPath.
		// If screensaver, prepare tour variables but use modified in tour functions.
		if (thisViewer.tour) {
			var destinationCurrent, tourAutoStart, tourAutoLoop;
		}

		// Prepare multi-image/multi-viewport variables if optional comparison/slideshow/animation/slidestack path parameter is set using image path parameter.
		if (thisViewer.imagePath !== null) {
			if (thisViewer.imagePath.indexOf('zComparisonPath') != -1) {
				thisViewer.imageSetPath = thisViewer.imagePath.substring(16, thisViewer.imagePath.length);
				thisViewer.imageSet = true;
				thisViewer.comparison = true;
			} else if (thisViewer.imagePath.indexOf('zSlidePath') != -1) {
				thisViewer.slidePath = thisViewer.imagePath.substring(11, thisViewer.imagePath.length);
				thisViewer.slideshow = true;
			} else if (thisViewer.imagePath.indexOf('zAnimationPath') != -1) {
				thisViewer.imageSetPath = thisViewer.imagePath.substring(15, thisViewer.imagePath.length);
				thisViewer.imageSet = true;
				thisViewer.animation = true;
			} else if (thisViewer.imagePath.indexOf('zSlidestackPath') != -1) {
				thisViewer.imageSetPath = thisViewer.imagePath.substring(16, thisViewer.imagePath.length);
				thisViewer.imageSet = true;
				thisViewer.slidestack = true;
			}
		}

		if (thisViewer.slideshow) {
			var slides = [], slideListDP = [];
			var slideCurrent, slideList, slideListPosition, slideListW, slideListSource, slideshowAutoStart, slideshowAutoLoop;
			var slideTransitionStep = (parseFloat(Z.Utils.getResource('DEFAULT_SLIDETRANSITIONSTEP')) * thisViewer.slideTransitionSpeed);
			thisViewer.slideTransitionTimeout = null;
			thisViewer.slideOpacity = 0;
		}

		// Prepare hotspot and/or annotation variables global to Viewport if optional parameter set.
		if (thisViewer.zoomRectangle || thisViewer.measureVisible || thisViewer.tour || thisViewer.hotspots || thisViewer.annotations || thisViewer.tracking) {
			var zoomRectangleDragging = null;
			var mTypeLegacy = false;
			var hotspots = [], hotspotsMedia = [], hotspotPopups = [], hotspotsFilterDisplayIDs = [], hotspotsFilterDisplayInternalIDs = [];
			var hotspotCurrent = null, hotspotCurrentID = null, hotspotDragging = null, hotspotDragPtStart = null, hotspotDragPtEnd = null, hotspotDragTimeStart = null;
			var hotspotPopupsMaxZIndex = 0, poiPriorID = null, labelPriorID = null, notePriorID = null;
			var MOUSECLICK_THRESHOLD_HOTSPOT = parseInt(Z.Utils.getResource('DEFAULT_MOUSECLICKTHRESHOLDHOTSPOT'), 10);
			var annotationPanelDisplay;
			var polygonCurrentPts = null, polygonsRequireCanvasAlertShown = false;
			var polygonComplete = true, controlPointCurrent = null, controlPointDragging = false;
			var hotspotNetConnector = new Z.NetConnector(thisViewer);

			var iconLineW = Z.Utils.getResource('DEFAULT_ICONLINEWIDTH');
			var polygonLineW = Z.Utils.getResource('DEFAULT_POLYGONLINEWIDTH');
			var polygonOpacity = parseFloat(Z.Utils.getResource('DEFAULT_POLYGONALPHA'));
			var polygonViewBuffer = parseInt(Z.Utils.getResource('DEFAULT_POLYGONVIEWBUFFER'), 10);

			var ctrlPtLineW = Z.Utils.getResource('DEFAULT_CONTROLPOINTLINEWIDTH');
			var ctrlPtStrokeColor = Z.Utils.getResource('DEFAULT_CONTROLPOINTSTROKECOLOR');
			var firstCtrlPtFillColor = Z.Utils.getResource('DEFAULT_FIRSTCONTROLPOINTFILLCOLOR');
			var stdCtrlPtFillColor = Z.Utils.getResource('DEFAULT_STANDARDCONTROLPOINTFILLCOLOR');
			var ctrlPtRadius = parseInt(Z.Utils.getResource('DEFAULT_CONTROLPOINTRADIUS'), 10);
			var polygonLineWFreehand = Z.Utils.getResource('DEFAULT_POLYGONLINEWIDTHFREEHAND');

			var captionTextColor = (thisViewer.captionTextColor) ? Z.Utils.stringValidateColorValue(thisViewer.captionTextColor) : Z.Utils.getResource('DEFAULT_CAPTIONTEXTCOLOR');
			var captionBackColor = (thisViewer.captionBackColor) ? Z.Utils.stringValidateColorValue(thisViewer.captionBackColor) : Z.Utils.getResource('DEFAULT_CAPTIONBACKCOLOR');
			var defaultFontSize = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONFONTSIZE'), 10);
			var minFontSize = parseInt(Z.Utils.getResource('DEFAULT_MINHOTSPOTCAPTIONFONTSIZE'), 10);
			var maxFontSize = parseInt(Z.Utils.getResource('DEFAULT_MAXHOTSPOTCAPTIONFONTSIZE'), 10);
			var defaultPadding = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONPADDING'), 10);
			var minPadding = parseInt(Z.Utils.getResource('DEFAULT_MINHOTSPOTCAPTIONPADDING'), 10);
			var maxPadding = parseInt(Z.Utils.getResource('DEFAULT_MAXHOTSPOTCAPTIONPADDING'), 10);
			if (Z.mobileDevice) { ctrlPtRadius *= 2; }
		}

		// Load image properties to get image width and height and tile size.  Alert user that local viewing is not
		// supported in certain browsers nor from storage alternatives other than image folders. Image properties
		// are HTML parameters from web page, bytes from image server, ZIF, PFF file, or XML values.
		if (thisViewer.imagePath !== null && thisViewer.imagePath != 'null') {

			// Prevent initialization if attempting to view Zoomify Folder locally and not in Firefox, or ZIF or PFF locally without file access support.
			var viewingOK = !Z.localUse;
			if (Z.localUse) {
				if (thisViewer.tileSource == 'ZoomifyZIFFile' && !Z.localFileSelected) {
					thisViewer.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-ZIF'), false, thisViewer.messageDurationShort, 'center');
				} else if (thisViewer.tileSource == 'ZoomifyPFFFile' && !Z.localFileSelected) {
					thisViewer.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-PFF'), false, Z.messageDurationStort, 'center');
				} else if ((Z.browser == Z.browsers.CHROME  || Z.browser == Z.browsers.OPERA || (Z.browser == Z.browsers.IE && Z.browserVersion == 11) || (Z.browser == Z.browsers.SAFARI && Z.browserVersion >= 7))) {
					thisViewer.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-BROWSER'), false, thisViewer.messageDurationStandard, 'center');
				} else {
					viewingOK = true;
				}

			} else if (thisViewer.imageW !== null && thisViewer.imageH !== null && thisViewer.sourceMagnification !== null ) {
				// Example image server protocol implementation: image properties provided via HTML parameters.
				// Note that this approach sets width, height, and tile size values directly from parameters during page
				// loading so it sets those values prior to viewer initialization and never during reinitialization.
				// See additional notes in function loadImagePropertiesImageServer.
				if (typeof thisViewport.getStatus !== 'undefined') {
					initializeViewport(thisViewer.imageW, thisViewer.imageH, TILE_WIDTH, TILE_HEIGHT, null, null, null, null, thisViewer.sourceMagnification, thisViewer.focal, thisViewer.quality);
				} else {
					var viewportInitTimer = window.setTimeout( function () { initializeViewport(thisViewer.imageW, thisViewer.imageH, TILE_WIDTH, TILE_HEIGHT, null, null, null, null, thisViewer.sourceMagnification, thisViewer.focal, thisViewer.quality); }, 100);
				}
				//var netConnector = new Z.NetConnector(thisViewer);
				//loadImageProperties(imagePath, netConnector);

			} else if (thisViewer.imageProperties !== null) {
				// Receive image properties as XML text in HTML parameter. Convert to XML doc and parse - skipping XML loading steps. This
				// approach provides workaround for cross-domain image storage and also enables optional support for image server tile fulfillment.
				var xmlDoc = Z.Utils.xmlConvertTextToDoc(thisViewer.imageProperties);
				viewingOK = false;
				parseImageXML(xmlDoc);

			} else if (thisViewer.imagePath.indexOf('zComparisonPath') == -1 && thisViewer.imagePath.indexOf('zSlidePath') == -1 && thisViewer.imagePath.indexOf('zOverlayPath') == -1 && thisViewer.imagePath.indexOf('zAnimationPath') == -1 && thisViewer.imagePath.indexOf('zSlidestackPath') == -1) {
				// Load byte range from ZIF or PFF or ImageProperties.xml file from Zoomify Image folder.
				viewingOK = true;
			}

			if (viewingOK) {
				var netConnector = new Z.NetConnector(thisViewer);
				loadImageProperties(imagePath, netConnector, viewportID);
			} else {
				return;
			}
		}

		function initializeViewport (iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality) {
			createCanvasContexts();
		
			// Set viewport variables to XML or header values.
			if (thisViewer.tileSource != 'ZoomifyPFFFile' || !thisViewer.pffJPEGHeadersSeparate) {
				thisViewer.imageW = iW;
				thisViewer.imageH = iH;
				thisViewer.imageCtrX = thisViewer.imageW / 2;
				thisViewer.imageCtrY = thisViewer.imageH / 2;
				thisViewer.imageD = Math.round(Math.sqrt(iW * iW + iH * iH));
				IMAGE_VERSION = iVersion;
				HEADER_SIZE = iHeaderSize;
				HEADER_SIZE_TOTAL = iHeaderSizeTotal;
				TILE_COUNT = iTileCount;
				TILE_WIDTH = tW;
				TILE_HEIGHT = tH;
			}

			// Example image server implementation: from example HTML or XML parameters.
			if (iMagnification !== null && iFocal !== null && iQuality !== null) {
				thisViewer.sourceMagnification = iMagnification;
				thisViewer.focal = iFocal;
				thisViewer.quality = iQuality;
			}

			// Record tier dimensions and tile counts for fast access.
			calculateTierValues();

			// Set initial dimensions and location of all viewport displays and ensure zoom and pan
			// initial values and limits do not conflict.
			
			setSizeAndPosition(viewW, viewH, viewL, viewT);
			validateXYZDefaults();

			// Set default scale for oversize backfill canvas or remove it if image size doesn't require it.
			if (tierCount > backfillTreshold3) {
				tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, thisViewer.initialZ);
				if (oD) { oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale); }
			} else {
				oD = null;
				oS = null;
				oCtx = null;
			}

			// Set default scales for other canvases.
			tierBackfillScale = convertZoomToTierScale(tierBackfill, thisViewer.initialZ);
			tierScale = convertZoomToTierScale(tierCurrent, thisViewer.initialZ);
			tierScalePrior = tierScale;
			if (thisViewer.useCanvas) {
				// Trap possible NS_ERROR_FAILURE error if working with large unconverted image.
				// DEV NOTE: Add retry or soft fail in catch in future implementation for firefox issue with large canvases.
				try {
					vCtx.scale(tierScale, tierScale);
				} catch (e) {
					thisViewer.showMessage(Z.Utils.getResource('ERROR_SCALINGCANVASFORUNCONVERTEDIMAGE'), false, thisViewer.messageDurationStandard, 'center');
					console.log('In function initializeViewportContinue scaling canvas:  ' + e);
				}
			}
			
			if (thisViewer.tileSource != 'unconverted') { thisViewport.precacheBackfillTiles(); }

			view(thisViewer.initialX, thisViewer.initialY, thisViewer.initialZ, thisViewer.initialR, null, true);

			// Set initial display to full screen if parameter true.
			if (thisViewer.initialFullPage) { thisViewport.toggleFullViewMode(true); }

			// Enable event handlers specific to Viewport and set viewport as initialized.
			initializeViewportEventListeners();
			setStatus('initializedViewport', true);
			syncViewportRelated();
		}

		// Initialization on callback after XML load after change of image path via setImage function.
		function reinitializeViewport (iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality) {
			// Clear prior image values.
			setStatus('initializedViewport', false);
			thisViewport.clearAll(true, false, true, true);

			// Calculate new image values.
			if (thisViewer.tileSource != 'ZoomifyPFFFile' || !thisViewer.pffJPEGHeadersSeparate) {
				thisViewer.imageW = iW;
				thisViewer.imageH = iH;
				thisViewer.imageCtrX = thisViewer.imageW / 2;
				thisViewer.imageCtrY = thisViewer.imageH / 2;
				thisViewer.imageD = Math.round(Math.sqrt(iW * iW + iH * iH));
				IMAGE_VERSION = iVersion;
				HEADER_SIZE = iHeaderSize;
				HEADER_SIZE_TOTAL = iHeaderSizeTotal;
				TILE_COUNT = iTileCount;
				TILE_WIDTH = tW;
				TILE_HEIGHT = tH;
			}

			if (!thisViewer.slideshow) { thisViewer.validateComponents(vpControl); }
			setParameters(thisViewer.parameters);

			// DEV NOTE: Optional HTML parameter custom tile dimensions override defaults, XML values, or server provided values.
			// but not custom tile dimensions applied in image list optional parameter values, so must override here.
			if (thisViewer.imageList) {
				if (thisViewer.tileW != tW) { TILE_WIDTH = tW = thisViewer.tileW; }
				if (thisViewer.tileH != tH) { TILE_HEIGHT = tH = thisViewer.tileH; }
			}

			calculateTierValues();

			if (thisViewer.hotspotPath !== null) {
				hotspotPath = thisViewer.hotspotPath;
				hotspotFolder = thisViewer.hotspotFolder;
			}
			if (thisViewer.annotationPath !== null) {
				annotationPath = thisViewer.annotationPath;
				annotationFolder = thisViewer.annotationFolder;
			}

			createDisplays(); // Create hotspots or annotation display and list or panel if required.
			createCanvasContexts();
			thisViewport.validateXYZDefaults();

			// Set default scale for oversize backfill canvas or remove it if image size doesn't require it.
			if (tierCount > backfillTreshold3) {
				tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, thisViewer.initialZ);
				oCtx.restore();
				oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
			} else {
				oD = oS = oCtx = null;
			}

			// Set default scales for other canvases.
			tierBackfillScale = convertZoomToTierScale(tierBackfill, thisViewer.initialZ);
			tierScale = convertZoomToTierScale(tierCurrent, thisViewer.initialZ);
			tierScalePrior = tierScale;
			if (thisViewer.useCanvas) {
				vCtx.restore();
				vCtx.scale(tierScale, tierScale);
			}

			// Load watermark, hotspots or annotations, virtual pointer, backfill tiles, and set initial view.
			if (wD) { loadWatermark(); }
			if (hD) {
				setDrawingColor('buttonColor0' + viewportID, true);
				if (thisViewer.tour || thisViewer.hotspots || thisViewer.annotations) {
					loadHotspotsOrAnnotationsData(viewportID);
				}
			}

			if (thisViewer.virtualPointerVisible) { thisViewer.createVirtualPointer(); }
			if (thisViewer.tileSource != 'unconverted') { thisViewport.precacheBackfillTiles(); }

			// Prior to setting size and position undo halving if two viewports. This permits function setSizeAndPosition to work simply for resizability.
			if (thisViewer.comparison) { viewW *= 2; }

			// Set size and position and update view with new default initial coordinates unless Comparing, in which case use initial coordinates in comparison.xml file and if none, do not reset coordinates.
			thisViewport.setSizeAndPosition(viewW, viewH, viewL, viewT);
			var initialValuesSet = (typeof thisViewer.parameters !== 'undefined' && thisViewer.parameters !== null && (typeof thisViewer.parameters.zInitialX !== 'undefined' || typeof thisViewer.parameters.zInitialY !== 'undefined' || typeof thisViewer.parameters.zInitialZoom !== 'undefined'));
			if ((thisViewer.comparison || thisViewer.overlays) && !initialValuesSet) {
				view(thisViewer.priorX, thisViewer.priorY, thisViewer.priorZ, thisViewer.priorR, null, true);
			} else {
				view(thisViewer.initialX, thisViewer.initialY, thisViewer.initialZ, thisViewer.initialR, null, true);
			}

			setStatus('initializedViewport', true);

			// Set Navigator thumbnail image and load tracking data if any.
			var navCurrent = (vpID == 0) ? thisViewer.Navigator : thisViewer.Navigator2;
			if (navCurrent) { navCurrent.setImage(thisViewport.getImagePath()); }
			if (thisViewer.tracking) { loadTrackingXML(viewportID); }

			// Sync changing Viewport view to unchanged Viewport view.
			if (thisViewer.comparison) {
				var vpComparison = (thisViewport.getViewportID() == 0) ? thisViewer.Viewport1 : thisViewer.Viewport0;
				var compCoordsFull = vpComparison.getCoordinatesFull(true);
				thisViewport.setView(compCoordsFull.x, compCoordsFull.y, compCoordsFull.z, compCoordsFull.r, null, null);
			}

			// Reinitialize related components.
			var topVP = thisViewer['Viewport' + (thisViewer.imageSetLength - 1).toString()];
			var vpControl = (thisViewer.overlays) ? topVP : thisViewer.viewportCurrent;

			// Configure components. First clear and recreate if new settings in params.
			// Do not clear and recreate if slideshow in progress.
			configureComponents(vpControl);

			// Sync related components.
			syncViewportRelated();

			// Validate callback, if any;
			validateCallback('reinitializedViewport');

			// Go to next slide if slideshow playing.
			if (thisViewer.slideshowPlaying) { thisViewport.nextSlide(); }
		}

		this.clearAll = function (clearTileVals, clearTierVals, clearDisplayVals, clearDisps) {
			if (clearTileVals) { clearTileValues(); }
			if (clearTierVals) { clearTierValues(); }
			if (clearDisplayVals) { clearDisplayValues(); }
			if (clearDisps) { clearDisplays(); }
		}

		function clearTileValues () {
			// Tile support.
			tilesToLoadTotal = 0;
			tilesLoadingNamesLength = 0;
			if (typeof tilesBackfillCached !== 'undefined') {Z.Utils.arrayClear(tilesBackfillCached); }
			if (typeof tilesBackfillCachedNames !== 'undefined') {Z.Utils.arrayClear(tilesBackfillCachedNames); }
			if (typeof tilesBackfillDisplayingNames !== 'undefined') { Z.Utils.arrayClear(tilesBackfillDisplayingNames); }
			if (typeof tilesDisplayingNames !== 'undefined') { Z.Utils.arrayClear(tilesDisplayingNames); }
			if (typeof tilesLoadingNames !== 'undefined') { Z.Utils.arrayClear(tilesLoadingNames); }
			if (typeof tilesCached !== 'undefined') { Z.Utils.arrayClear(tilesCached); }
			if (typeof tilesCachedNames !== 'undefined') { Z.Utils.arrayClear(tilesCachedNames); }
			if (typeof tilesCachedInView !== 'undefined') { Z.Utils.arrayClear(tilesCachedInView); }
			if (typeof tilesCachedInViewNames !== 'undefined') { Z.Utils.arrayClear(tilesCachedInViewNames); }
			if (typeof tilesInView !== 'undefined') { Z.Utils.arrayClear(tilesInView); }
			if (typeof tilesInViewNames !== 'undefined') { Z.Utils.arrayClear(tilesInViewNames); }

			// ZIF & PFF support.
			if (typeof tilesRetry !== 'undefined') { Z.Utils.arrayClear(tilesRetry); }
			if (typeof tilesRetryNamesChunks !== 'undefined') { Z.Utils.arrayClear(tilesRetryNamesChunks); }
			if (typeof tilesRetryNames !== 'undefined') { Z.Utils.arrayClear(tilesRetryNames); }
			if (typeof tilesBackfillRetryNames !== 'undefined') { Z.Utils.arrayClear(tilesBackfillRetryNames); }

			// Annotation save-to-file support.
			if (typeof fullImageTilesBackfillCached !== 'undefined') { Z.Utils.arrayClear(fullImageTilesBackfillCached); }
			if (typeof fullImageTilesBackfillCachedNames !== 'undefined') { Z.Utils.arrayClear(fullImageTilesBackfillCachedNames); }
			if (typeof fullImageTilesCached !== 'undefined') {Z.Utils.arrayClear(fullImageTilesCached); }
			if (typeof fullImageTilesCachedNames !== 'undefined') {Z.Utils.arrayClear(fullImageTilesCachedNames); }
			if (typeof fullImageTilesAllCachedNames !== 'undefined') {Z.Utils.arrayClear(fullImageTilesAllCachedNames); }
		}

		function clearTierValues () {
			tierCount = 1;
			tierCurrent = 0;
			tierBackfill = 0;
			tierBackfillDynamic = false;
			backfillTresholdCached0 = false;
			backfillTresholdCached1 = false;
			backfillTresholdCached2 = false;
			if (typeof tierWs !== 'undefined') { Z.Utils.arrayClear(tierWs); }
			if (typeof tierHs !== 'undefined') { Z.Utils.arrayClear(tierHs); }
			if (typeof tierWInTiles !== 'undefined') { Z.Utils.arrayClear(tierWInTiles); }
			if (typeof tierHInTiles !== 'undefined') { Z.Utils.arrayClear(tierHInTiles); }
			if (typeof tierTileCounts !== 'undefined') { Z.Utils.arrayClear(tierTileCounts); }

			// ZIF support.
			if (typeof tierTileOffsetsStart !== 'undefined') { Z.Utils.arrayClear(tierTileOffsetsStart); }
			if (typeof tierTileOffsetsCount !== 'undefined') { Z.Utils.arrayClear(tierTileOffsetsCount); }
			if (typeof tierTileOffsetChunks !== 'undefined') { Z.Utils.arrayClear(tierTileOffsetChunks); }
			if (typeof tierTileOffsetLast !== 'undefined') { Z.Utils.arrayClear(tierTileOffsetLast); }
			if (typeof tierTileByteCountsStart !== 'undefined') { Z.Utils.arrayClear(tierTileByteCountsStart); }
			if (typeof tierTileByteCountsCount !== 'undefined') { Z.Utils.arrayClear(tierTileByteCountsCount); }
			if (typeof tierTileByteCountChunks !== 'undefined') { Z.Utils.arrayClear(tierTileByteCountChunks); }
			if (typeof tierTileByteCountLast !== 'undefined') { Z.Utils.arrayClear(tierTileByteCountLast); }

			// PFF support.
			if (typeof jpegHeaderArray !== 'undefined') { Z.Utils.arrayClear(jpegHeaderArray); }
			if (typeof offsetChunks !== 'undefined') { Z.Utils.arrayClear(offsetChunks); }
			if (typeof offsetChunkBegins !== 'undefined') { Z.Utils.arrayClear(offsetChunkBegins); }
		}

		function clearDisplayValues () {
			if (wD) {
				if (typeof watermarksX !== 'undefined') { Z.Utils.arrayClear(watermarksX); }
				if (typeof watermarksY !== 'undefined') { Z.Utils.arrayClear(watermarksY); }
			}
			if (hD) {
				if (typeof hotspots !== 'undefined') { Z.Utils.arrayClear(hotspots); }
				if (typeof hotspotsMedia !== 'undefined') { Z.Utils.arrayClear(hotspotsMedia); }
				if (typeof hotspotPopups !== 'undefined') { Z.Utils.arrayClear(hotspotPopups); }
				if (hotspotList != null) {
					hotspotList.parentNode.removeChild(hotspotList);
					hotspotList = null;
					if (typeof hotspotListDP !== 'undefined') { Z.Utils.arrayClear(hotspotListDP); }
				} else {
					if (poiList != null) {
						poiList.parentNode.removeChild(poiList);
						poiList = null;
						if (typeof poiListDP !== 'undefined') { Z.Utils.arrayClear(poiListDP); }
					}
					if (labelList != null) {
						labelList.parentNode.removeChild(labelList);
						labelList = null;
						if (typeof labelListDP !== 'undefined') { Z.Utils.arrayClear(labelListDP); }
						if (typeof labelListCurrentDP !== 'undefined') { Z.Utils.arrayClear(labelListCurrentDP); }
					}
					if (noteList != null) {
						noteList.parentNode.removeChild(noteList);
						noteList = null;
						if (typeof noteListDP !== 'undefined') { Z.Utils.arrayClear(noteListDP); }
						if (typeof noteListCurrentDP !== 'undefined') { Z.Utils.arrayClear(noteListCurrentDP); }
					}
				}
			}
			if (thisViewer.imageFilters) {
				imageFilterTimer = null;
				imageFilterBackfillTimer = null;
				imageFilterRetryTimer = null;
				imageFilterStatesConvolve = false;
				if (typeof imageFiltersApplied !== 'undefined') { Z.Utils.arrayClear(imageFiltersApplied); }
				if (typeof tileImages !== 'undefined') { Z.Utils.arrayClear(tileImages); }
				cachedCanvas = null;
				cachedCanvasBackfill = null;
				cachedCanvasPrefilter = null;
				cachedCanvasFiltering = null;
				imageFilterBrightnessValue = 0;
				imageFilterContrastValue = 0;
				imageFilterSharpnessValue = 0;
				imageFilterBlurrinessValue = 0;
				imageFilterColorRedValue = 0;
				imageFilterColorGreenValue = 0;
				imageFilterColorBlueValue = 0;
				imageFilterColorRedRangeValue = 0;
				imageFilterColorGreenRangeValue = 0;
				imageFilterColorBlueRangeValue = 0;
				imageFilterColorRedRangeValue2 = 0;
				imageFilterColorGreenRangeValue2 = 0;
				imageFilterColorBlueRangeValue2 = 0;
				imageFilterGammaValue = 0;
				imageFilterGammaRedValue = 0;
				imageFilterGammaGreenValue = 0;
				imageFilterGammaBlueValue = 0;
				imageFilterHueValue = 0;
				imageFilterSaturationValue = 0;
				imageFilterLightnessValue = 0;
				imageFilterWhiteBalanceValue = 0;
				imageFilterEqualizeValue = 0;
				imageFilterNoiseValue = 0;
				imageFilterGlowValue = 0;
			}
		}

		function clearDisplays () {
			if (oD) { Z.Utils.clearDisplay(oD, thisViewer); }
			if (bD) { Z.Utils.clearDisplay(bD, thisViewer); }
			if (vD) { Z.Utils.clearDisplay(vD, thisViewer); }
			if (tC) { Z.Utils.clearDisplay(tC, thisViewer); }
			if (wD) { Z.Utils.clearDisplay(wD, thisViewer); }
			if (mC) { Z.Utils.clearDisplay(mC, thisViewer); }
			if (hD) {
				Z.Utils.clearDisplay(hD, thisViewer);
				hD = null;
			}
			if (annD) {
				//Z.Utils.clearDisplay(annD, thisViewer); // DEV NOTE: Use next line instead to delete panel DIV.
				thisViewport.clearAnnotationPanel(viewportID);
				setStatus('annotationPanelInitializedViewport', false);
				annD = null;
			}
			if (dD) { Z.Utils.clearDisplay(dD, thisViewer); }
			if (eD) { Z.Utils.clearDisplay(eD, thisViewer); }
			if (fC) { Z.Utils.clearDisplay(fC, thisViewer); }
			if (fbC) { Z.Utils.clearDisplay(fbC, thisViewer); }
		}

		function createDisplays (vpID) {
			if (typeof vpID === 'undefined' || vpID === null) { vpID = 0; }
			var vpIDStr = vpID.toString();

			// Create non-draggable non-moving, non-resizing deep background display for oversize
			// image temporary low-resolution fill during rapid zoom or pan while backfill and frontfill
			// tiles download. Must draw tiles on-the-fly unlike other displays.
			if (thisViewer.useCanvas) {
				if (!oD) {
					oversizeDisplay = Z.Utils.createContainerElement(zvIntID, 'canvas', 'oversizeDisplay' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
					thisViewer.ViewerDisplay.appendChild(oversizeDisplay);
					oD = oversizeDisplay;
					oS = oD.style;
				}
			}

			// Create masking container for displays if comparison requires limiting display to half of Viewer.
			if (thisViewer.comparison && !cmD) {
				comparisonMaskContainer = Z.Utils.createContainerElement(zvIntID, 'div', 'comparisonMaskContainer' + vpIDStr, 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				thisViewer.ViewerDisplay.appendChild(comparisonMaskContainer);
				cmD = comparisonMaskContainer;
				cmS = cmD.style;
			}

			// Create draggable container for backfill, viewport, watermark, and hotspot displays.
			// Scaling occurs in display canvases directly or in tiles if in non-canvas browser.
			// Set position 'absolute' within parent viewerDisplay container that is set 'relative'.
			if (!cD) {
				viewportContainer = Z.Utils.createContainerElement(zvIntID, 'div', 'viewportContainer' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				if (!thisViewer.comparison) {
					thisViewer.ViewerDisplay.appendChild(viewportContainer);
				} else {
					comparisonMaskContainer.appendChild(viewportContainer);
				}
				cD = viewportContainer;
				cS = cD.style;
			}

			// Create background display to fill gaps between foreground tiles in viewportDisplay.
			// Note that using canvas is practical because backfill tier is low res and thus small and canvas is CSS scaled large, not internally scaled large or drawn large.
			if (!bD) {
				viewportBackfillDisplay = Z.Utils.createContainerElement(zvIntID, thisViewer.useCanvas ? 'canvas' : 'div', 'viewportBackfillDisplay' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				viewportContainer.appendChild(viewportBackfillDisplay);
				bD = viewportBackfillDisplay;
				bS = bD.style;
			}

			// Create canvas or div container for image tiles.
			if (!vD) {
				viewportDisplay = Z.Utils.createContainerElement(zvIntID, thisViewer.useCanvas ? 'canvas' : 'div', 'viewportDisplay' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				viewportContainer.appendChild(viewportDisplay);
				vD = viewportDisplay;
				vS = vD.style;
			}

			// Create transition canvas, if supported, for temporary display while display canvas is updated.
			// Also create temporary canvases for unifying tile sets for new views prior to applying convolution filters.
			if (thisViewer.useCanvas) {
				if (!tC) {
					transitionCanvas = Z.Utils.createContainerElement(zvIntID, 'canvas', 'transitionCanvas', 'none', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
					viewportContainer.appendChild(transitionCanvas);
					tC = transitionCanvas;
					tS = tC.style;
				}
				if (thisViewer.imageFilters) {
					if (!fbC) {
						imageFilterBackfillCanvas = Z.Utils.createContainerElement(zvIntID, 'canvas', 'imageFilterBackfillCanvas', 'none', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
						viewportContainer.appendChild(imageFilterBackfillCanvas);
						fbC = imageFilterBackfillCanvas;
						fbS = fbC.style;
					}
					if (!fC) {
						imageFilterCanvas = Z.Utils.createContainerElement(zvIntID, 'canvas', 'imageFilterCanvas', 'none', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
						viewportContainer.appendChild(imageFilterCanvas);
						fC = imageFilterCanvas;
						fS = fC.style;
					}
				}
			}

			// Create canvas or div container for watermarks.
			if (thisViewer.watermarks && !wD) {
				watermarkDisplay = Z.Utils.createContainerElement(zvIntID, 'div', 'watermarkDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				viewportContainer.appendChild(watermarkDisplay);
				wD = watermarkDisplay;
				wS = wD.style;
			}

			// Create masking canvas if hotspot/label selection masking enabled.
			if (thisViewer.maskVisible && !mC) {
				maskCanvas = Z.Utils.createContainerElement(zvIntID, 'canvas', 'maskCanvas', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				viewportContainer.appendChild(maskCanvas);
				mC = maskCanvas;
				mS = mC.style;
				mS.display = 'none';
			}

			// Create canvas or div containers for zoom rectangle, measuring, tours, screensavers, hotspots, annotations, editing, and saving to image file.
			var displaying = ((thisViewer.zoomRectangle || thisViewer.measureVisible || (thisViewer.tour && !thisViewer.screensaver) || thisViewer.hotspots || thisViewer.annotations));
			var drawing = thisViewer.useCanvas && (displaying || (thisViewer.hotspots && Z.labelIconsInternal));
			var editing = thisViewer.useCanvas && (thisViewer.zoomRectangle || thisViewer.measureVisible || thisViewer.editMode !== null);
			var saving = drawing && thisViewer.saveImageHandlerProvided;
			if (drawing && !dD) {
				drawingDisplay = Z.Utils.createContainerElement(zvIntID, 'canvas', 'drawingDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				viewportContainer.appendChild(drawingDisplay);
				dD = drawingDisplay;
				dS = dD.style;
			}
			if (editing && !eD) {
				editingDisplay = Z.Utils.createContainerElement(zvIntID, 'canvas', 'editingDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				viewportContainer.appendChild(editingDisplay);
				eD = editingDisplay;
				eS = eD.style;
			}
			if (displaying && !hD) {
				hotspotDisplay = Z.Utils.createContainerElement(zvIntID, 'div', 'hotspotDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				viewportContainer.appendChild(hotspotDisplay);
				hD = hotspotDisplay;
				hS = hD.style;
				Z.Utils.addEventListener(hotspotDisplay, 'mousedown', Z.Utils.preventDefault);
			}
			if (saving && !sD) {
				savingDisplay = Z.Utils.createContainerElement(zvIntID, 'canvas', 'savingDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
				viewportContainer.appendChild(savingDisplay);
				sD = savingDisplay;
				sS = sD.style;
				sS.display = 'none';
			}

			// Clear prior div contents.
			if (!thisViewer.useCanvas) {
				bD.innerHTML = '';
				vD.innerHTML = '';
			}
			if (wD) { wD.innerHTML = ''; }
			if (hD) { hD.innerHTML = ''; }
		}

		function createCanvasContexts () {
			if (thisViewer.useCanvas) {
				if (oD) { oCtx = oD.getContext('2d'); }
				bCtx = bD.getContext('2d');
				vCtx = vD.getContext('2d');
				tCtx = tC.getContext('2d');
				if (dD) { dCtx = dD.getContext('2d'); }
				if (eD) { eCtx = eD.getContext('2d'); }
				if (mC) { mCtx = mC.getContext('2d'); }
				if (sD) { sCtx = sD.getContext('2d'); }
				if (thisViewer.imageFilters) {
					fCtx = fC.getContext('2d');
					fbCtx = fbC.getContext('2d');
				}
			}
		}

		// DEV NOTE: Dual setSizeAndPosition functions below are workaround for undefined error on load
		// due to unhoisted function expression vs hoisted function declaration and/or IE8 limitations.
		this.setSizeAndPosition = function (width, height, left, top) {
			setSizeAndPosition(width, height, left, top);
		}

		function setSizeAndPosition (width, height, left, top) {
			// Set Viewport size and set base values or subsequent gets and sets will fail.
			if (typeof left === 'undefined' || left === null) { left = 0; }
			if (typeof top === 'undefined' || top === null) { top = 0; }

			thisViewer.viewerW = viewW = width;
			thisViewer.viewerH = viewH = height;

			// If displaying two viewports, adjust widths and horizontal positions.
			if (thisViewer.comparison) {
				var viewHalf = width / 2;
				viewW = width = viewHalf;
			}

			displayW = viewW * PAN_BUFFER;
			displayH = viewH * PAN_BUFFER;

			// Prevent canvas sizes too large if working with image set, image is unconverted in Firefox, or for lower limits of other browsers. Additional limit for
			// unconverted images to actual image size plus buffer if pan contraint is non-strict. Mobile devices also limit max canvas size: 3 to 32 decoded
			// megapixels depending on device, file format, and memory. Additional limit on creation of oversize backfill display. Last test ensures canvas at least as large as view area.
			var canvasSizeMax = (thisViewer.imageSet) ? PAN_BUFFERSIZEMAXIMAGESET : (thisViewer.tileSource == 'unconverted' && Z.mobileDevice) ? PAN_BUFFERSIZEMAXMOBILE : (thisViewer.tileSource == 'unconverted' && Z.browser == Z.browsers.FIREFOX) ? PAN_BUFFERSIZEMAXFIREFOX : PAN_BUFFERSIZEMAXBROWSER;
			var imgW = (thisViewer.constrainPanStrict) ? thisViewer.imageW : thisViewer.imageW * 2; // Alternative implementation: Limit to thisViewer.imageW if (thisViewer.constrainPanStrict || (thisViewer.imageSet && thisViewer.tileSource == 'unconverted')).
			var imgH = (thisViewer.constrainPanStrict) ? thisViewer.imageH : thisViewer.imageH * 2;  // Alternative implementation: Limit to thisViewer.imageH if (thisViewer.constrainPanStrict || (thisViewer.imageSet && thisViewer.tileSource == 'unconverted')).
			if (displayW > canvasSizeMax) { displayW = canvasSizeMax; }
			if (displayH > canvasSizeMax) { displayH = canvasSizeMax; }
			if (displayW > imgW) { displayW = imgW; }
			if (displayH > imgH) { displayH = imgH; }
			if (displayW < viewW) { displayW = viewW; }
			if (displayH < viewH) { displayH = viewH; }

			// Calculate center and edge values.
			var digits = 4;
			displayCtrX = Z.Utils.roundToFixed(displayW / 2, digits);
			displayCtrY = Z.Utils.roundToFixed(displayH / 2, digits);
			displayL = Z.Utils.roundToFixed(-((displayW - viewW) / 2) + left, digits);
			displayR = Z.Utils.roundToFixed(((displayW - viewW) / 2) + left, digits);
			displayT = Z.Utils.roundToFixed(-((displayH - viewH) / 2) + top, digits);
			displayB = Z.Utils.roundToFixed(((displayH - viewH) / 2) + top, digits);

			if (oD) {
				oD.width = viewW;
				oD.height = viewH;
				oS.width = viewW + 'px';
				oS.height = viewH + 'px';
				oS.left = '0px';
				oS.top = '0px';
			}

			// Set comparison masking container dimension and position.
			if (thisViewer.comparison) {
				cmD.width = viewW;
				cmD.height = viewH;
				cmS.width = viewW + 'px';
				cmS.height = viewH + 'px';

				cmS.left = (vpID == 0) ? '0px' : viewW + 'px';

				cmS.top = '0px';
			}

			cD.width = displayW;
			cD.height = displayH;
			cS.width = displayW + 'px';
			cS.height = displayH + 'px';

			// Set container position. Viewport, watermark, and hotspot display values are static as they move
			// via the container. Backfill display changes position and size as it scales to support Navigator panning.
			cS.left = displayL + 'px';
			cS.top = displayT + 'px';

			// Sync viewport display size.
			vD.width = displayW;
			vD.height = displayH;
			vS.width = displayW + 'px';
			vS.height = displayH + 'px';

			// Sync watermark display size.
			if (wD) {
				wD.width = displayW;
				wD.height = displayH;
				wS.width = displayW + 'px';
				wS.height = displayH + 'px';
			
				// Ensure proper z-ordering of Viewer elements.
				wS.zIndex = (Z.baseZIndex + 1).toString();
			}

			// Sync mask display size.
			if (mC) {
				mC.width = displayW;
				mC.height = displayH;
				mS.width = displayW + 'px';
				mS.height = displayH + 'px';
			}

			// Sync hotspot display size.
			if (hD) {
				hD.width = displayW;
				hD.height = displayH;
				hS.width = displayW + 'px';
				hS.height = displayH + 'px';
				if (hotD) {
					var listW = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTLISTWIDTH'), 10);
					var listCoords = calculateHotspotListCoords(hotspotListPosition, listW, viewW, viewH); // viewH allows for toolbar height if static in viewer display area.
					hotS.left = listCoords.x + 'px';
					hotS.top = listCoords.y + 'px';
				}
			}

			// Sync drawing display size.
			if (dD) {
				dD.width = displayW;
				dD.height = displayH;
				dS.width = displayW + 'px';
				dS.height = displayH + 'px';
			}

			// Sync editing display size.
			if (eD) {
				eD.width = displayW;
				eD.height = displayH;
				eS.width = displayW + 'px';
				eS.height = displayH + 'px';
			}

			// Position annotation display.
			if (annD) {
				var panelDims = new thisViewport.calculateAnnotationPanelDimensions(poiVisibility, labelVisibility, noteVisibility, commentVisibility);
				var panelCoords = thisViewport.calculateAnnotationPanelCoords(annotationPanelPosition, panelDims.w, panelDims.h, viewW, viewH); // viewH allows for toolbar height if static in viewer display area.
				thisViewport.sizeAndPositionAnnotationPanel(annS, panelDims.w, panelDims.h, panelCoords.x, panelCoords.y);
			}

			if (thisViewer.imageSet) { thisViewer.sizeAndPositionImageSetList(); }

			// Set drawing origin coordinates to viewport display center.
			if (thisViewer.useCanvas) {
				if (oD) {
					oCtx.translate(viewW / 2, viewH / 2);
					oCtx.save();
				}

				// Trap possible NS_ERROR_FAILURE error especially in firefox especially if working with large unconverted image.
				// DEV NOTE: Add retry or soft fail in catch in future implementation for firefox issue with large canvases.
				try {
					vCtx.translate(displayCtrX, displayCtrY);
				} catch (e) {
					thisViewer.showMessage(Z.Utils.getResource('ERROR_TRANSLATINGCANVASFORUNCONVERTEDIMAGE'), false, thisViewer.messageDurationStandard, 'center');
				}
				vCtx.save();

				if (mC) {
					mCtx.translate(displayCtrX, displayCtrY);
					mCtx.save();
				}
				if (dD) {
					dCtx.translate(displayCtrX, displayCtrY);
					dCtx.save();
				}
				if (eD) {
					eCtx.translate(displayCtrX, displayCtrY);
					eCtx.save();
				}
			}

			// No setSizeAndPosition steps required here for non-canvas browsers because positioning
			// occurs in drawTileInHTML function based on x and y values passed in by displayTile.
		}

		this.syncViewportResize = function (imgX, imgY, imgZ, imgR) {
			thisViewport.setSizeAndPosition(thisViewer.viewerW, thisViewer.viewerH, 0, 0);
			thisViewport.resizeViewport(imgX, imgY, imgZ, imgR);
		}

		this.resizeViewport = function (imgX, imgY, imgZ, imgR) {
			thisViewport.validateXYZDefaults();
			thisViewport.setView(imgX, imgY, imgZ, imgR);
		}

		this.loadImageProperties = function (imgPath, netCnnctr, vpID) {
			loadImageProperties(imgPath, netCnnctr, vpID);
		};

		function loadImageProperties (imgPath, netCnnctr, vpID) {			
			// Load image properties from Zoomify Image ZIF file header, folder XML file, PFF file header, or other specified tile source.
			if (thisViewer.tileSource == 'ZoomifyZIFFile') {
				loadImagePropertiesZIF(imgPath, netCnnctr, vpID);
			} else if (thisViewer.tileSource == 'ZoomifyImageFolder') {
				var imageXMLPath = Z.Utils.cacheProofPath(imgPath + '/' + 'ImageProperties.xml');
				netCnnctr.loadXML(imageXMLPath, vpID);
			} else if (thisViewer.tileSource == 'ZoomifyPFFFile') {
				loadImagePropertiesPFF(imgPath, netCnnctr, vpID);
			} else if (thisViewer.tileSource == 'DZIFolder') {
				var imagePropsPath = formatFilePathDZI(imgPath, 'properties');
				netCnnctr.loadXML(imagePropsPath, vpID);
			} else if (thisViewer.tileSource == 'IIIFImageServer') {
				var imageJSONPath = imgPath + '/' + 'info.json';
				loadImagePropertiesIIIFImageServer(imageJSONPath, netCnnctr, vpID);
			} else if (thisViewer.tileSource == 'ImageServer') {
				// Example image server protocol implementation.
				loadImagePropertiesImageServer(imgPath, netCnnctr, vpID);
			}
		}

		function loadImagePropertiesZIF (imgPath, netCnnctr, vpID) {
			//console.log(imgPath, vpID, thisViewer.tileSource, thisViewer.tileSourceMultiple);
			// Define constants. Load enough bytes for TIF IFDs for pyramid between 2,164,260,864 x 2,164,260,864 pixels
			// and 4,294,967,296 x 4,294,967,296 pixels (assuming a tile size of 256 x 256).
			var HEADER_START_BYTE = parseFloat(Z.Utils.getResource('DEFAULT_HEADERSTARTBYTE'));
			var HEADER_END_BYTE = parseFloat(Z.Utils.getResource('DEFAULT_HEADERENDBYTEZIF'));
			netCnnctr.loadByteRange(imgPath, HEADER_START_BYTE, HEADER_END_BYTE, 'header', null, null, vpID);
		}

		function loadImagePropertiesPFF (imgPath, netCnnctr, vpID) {
			// Define constants.
			var REQUEST_TYPE = 1; // 1 = header, 2 = offset, 0 = tile.		
			if (thisViewer.tileHandlerPathFull === null) {
				// PFF viewing without servlet.
				var HEADER_START_BYTE = parseFloat(Z.Utils.getResource('DEFAULT_HEADERSTARTBYTE'));
				var HEADER_END_BYTE = parseFloat(Z.Utils.getResource('DEFAULT_HEADERENDBYTEPFF'));
				netCnnctr.loadByteRange(imgPath, HEADER_START_BYTE, HEADER_END_BYTE, 'header', null, null, vpID);

			} else {
				// PFF viewing with servlet. Build data request with query string and send.
				var HEADER_START_BYTE = Z.Utils.getResource('DEFAULT_HEADERSTARTBYTE');
				var HEADER_END_BYTE = Z.Utils.getResource('DEFAULT_HEADERENDBYTEPFF');
				var imgPathNoDot = imgPath.replace('.', '%2E');  // Required for servlet.
				var imageXMLPath = thisViewer.tileHandlerPathFull + '?file=' + imgPathNoDot  + '&requestType=' + REQUEST_TYPE + '&begin=' + HEADER_START_BYTE + '&end=' + HEADER_END_BYTE;
				netCnnctr.loadXML(imageXMLPath, vpID);
			}
		}

		function loadImagePropertiesIIIFImageServer (iiifInfoPath, netCnnctr, vpID) {
			netCnnctr.loadJSON(iiifInfoPath, vpID);
		}

		function loadImagePropertiesImageServer (imgPath, netCnnctr, vpID) {
			// Example image server protocol implementation - optional implementation:
			// Image properties provided by image server.  Modify the following line to request
			// image properties according to specific 3rd party image server protocol as documented
			// by image server provider. Minimum return values required: full source image width and
			// height, and tile size if not 256x256 pixels. Additionally modify function 'parseImageXML'
			// as noted in 'Optional implementation' notes within that function.
			//var imageXMLPath = thisViewer.tileHandlerPathFull + '?' + '...';
			//netCnnctr.loadXML(imageXMLPath, vpID);
		}

		this.parseZIFHeader = function (data) {
			clearTierValues();

			if (data[0] == 0x49 && data[1] == 0x49 && data[2] == 0x2b && data[3] == 0x00 && data[4] == 0x08 &&  data[5] == 0x00 && data[6] == 0x00 && data[7] == 0x00 && data[8] == 0x10 && data[9] == 0x00 && data[10] == 0x00 && data[11] == 0x00 && data[12] == 0x00 && data[13] == 0x00 && data[14] == 0x00 && data[15] == 0x00) {

				// Set start values.
				var ifdOffset = Z.Utils.longValue(data, 8); // First IFD.
				var tagCounter = Z.Utils.longValue(data, ifdOffset); // First tag.
				var ifdCounter = 1;

				// Set key variables and constants of Zoomify Image.
				var iW = null, iH = null, tW = null, tH = null, iTileCount = null, iByteCountCount = null, iImageCount = null, iVersion = null, iHeaderSize = null, iHeaderSizeTotal = null, iMagnification = null, iFocal = null, iQuality = null;
				iImageCount=1;  // One image per ZIF file in current release.
				iVersion=2.0;  // ZIF designation (PFF latest revision v1.8).

				// Parse ZIF header to extract tier and tile values.
				while (ifdOffset != 0) {
					for (var x = 0; x < tagCounter; x++) {
						var itemOffset = ifdOffset + 8 + x * 20;
						var tag = Z.Utils.shortValue(data, itemOffset);

						switch (tag) {
							case 256: // Image width.
								tierWs[ifdCounter - 1] = Z.Utils.intValue(data, itemOffset + 12);
								break;
							case 257: // Image height.
								tierHs[ifdCounter - 1] = Z.Utils.intValue(data, itemOffset + 12);
								break;
							case 322: // Tile width.
								// DEV NOTE: Assume equal across tiers and equal to tile height in current release.
								tW = Z.Utils.intValue(data, itemOffset + 12);
								break;
							case 323: // Tile height.
								// DEV NOTE: Assume equal across tiers and equal to tile width in current release.
								tH = Z.Utils.intValue(data, itemOffset + 12);
								break;
							case 324: // Tile offsets.
								// At itemOffset, get start of tile offsets for tier, or of tile itself if only one.
								var itemCount = tierTileOffsetsCount[ifdCounter - 1] = Z.Utils.longValue(data, itemOffset + 4);
								tierTileOffsetsStart[ifdCounter - 1] = Z.Utils.longValue(data, itemOffset + 12);
								iTileCount +=  itemCount;
								break;
							case 325: // Tile byte counts.
								// At itemOffset, get start of tile byte counts for tier, or byte count itself if only one, or two byte counts if two.
								var itemCount = tierTileByteCountsCount[ifdCounter - 1] = Z.Utils.longValue(data, itemOffset + 4);
								if (itemCount == 1) {
									tierTileByteCountsStart[ifdCounter - 1] = Z.Utils.intValue(data, itemOffset + 12);
								} else if (itemCount == 2) {
									tierTileByteCountsStart[ifdCounter - 1] = Z.Utils.intValue(data, itemOffset + 12) + ',' + Z.Utils.intValue(data, itemOffset + 16);
								} else {
									tierTileByteCountsStart[ifdCounter - 1] = Z.Utils.longValue(data, itemOffset + 12);
								}
								iByteCountCount +=  itemCount;
								break;
						}
					}
					ifdOffset = Z.Utils.longValue(data, ifdOffset + tagCounter * 20 + 8);
					tagCounter = Z.Utils.longValue(data, ifdOffset);
					ifdCounter++;
				}

				iW = tierWs[0];
				iH = tierHs[0];
				tierCount = ifdCounter - 1;

				// Invert array orders so that 0 element is thumbnail tier not source tier.
				tierWs.reverse();
				tierHs.reverse();
				tierTileOffsetsCount.reverse();
				tierTileOffsetsStart.reverse();
				tierTileByteCountsCount.reverse();
				tierTileByteCountsStart.reverse();

				// Debug option: Display ZIF header values.
				/* console.log('Width & Height: ' + iW + ' & ' + iH);
				console.log('Tile Count: ' + iTileCount);
				console.log('tierWs: ' + tierWs.toString());
				console.log('tierTileOffsetsCount: ' + tierTileOffsetsCount.toString());
				console.log('tierTileOffsetsStart: ' + tierTileOffsetsStart.toString());
				console.log('tierTileByteCountsCount: ' + tierTileByteCountsCount.toString());
				console.log('tierTileByteCountsStart: ' + tierTileByteCountsStart.toString());
				*/

				// Initialize or reinitialize Viewport.
				if (!isNaN(iW) && iW > 0 && !isNaN(iH) && iH > 0 && !isNaN(tW) && tW > 0 && !isNaN(tH) && tH > 0 && iTileCount > 0) {
					if (!getStatus('initializedViewport')) {
						initializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);
					} else {
						reinitializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);
					}
				} else {
					thisViewer.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESINVALID'), false, thisViewer.messageDurationStandard, 'center');
				}
			}
		}

		this.parseZIFOffsetChunk = function (data, chunkID) {
			var index = Z.Utils.arrayIndexOfObjectValue(tierTileOffsetChunks, 'chunkID', chunkID);
			if (index != -1) {
				tierTileOffsetChunks[index].chunk = data;
				selectTilesRetry(chunkID, 'offset');
			}
		}

		this.parseZIFByteCountChunk = function (data, chunkID) {
			var index = Z.Utils.arrayIndexOfObjectValue(tierTileByteCountChunks, 'chunkID', chunkID);
			if (index != -1) {
				tierTileByteCountChunks[index].chunk = data;
				selectTilesRetry(chunkID, 'byteCount');
			}
		}

		this.parseZIFImage = function (data, tile, target) {		
			var src = 'data:image/jpeg;base64,' + Z.Utils.encodeBase64(data);
			var loadHandler;
			if (target == 'image-display') {
				loadHandler = (getStatus('imageSaving')) ? onTileLoadToSave : onTileLoad;
			} else if (target == 'image-backfill') {
				loadHandler = (getStatus('imageSaving')) ? onTileBackfillLoadToSave : onTileBackfillLoad;
			} else if (target == 'navigator') {
				if (!thisViewer.comparison || viewportID == 0) {
					if (thisViewer.Navigator) { loadHandler = thisViewer.Navigator.initializeNavigator; }
				} else {			
					if (thisViewer.Navigator2) { loadHandler = thisViewer.Navigator2.initializeNavigator; } 
				}
			} else if (target == 'gallery') {
				loadHandler = thisViewer.Gallery.initializeGallery;
			}
			var func = Z.Utils.createCallback(null, loadHandler, tile);
			Z.Utils.createImageElementFromBytes(src, func);
		}

		this.parsePFFImage = function (data, tile, target) {
			var src;
			if (thisViewer.pffJPEGHeadersSeparate) {
				var jpegHeaderIndex = Z.Utils.intValue(data, data.length-4, true);
				src = 'data:image/jpeg;base64,' + Z.Utils.encodeBase64(jpegHeaderArray[jpegHeaderIndex], 0) + Z.Utils.encodeBase64(data, 0);
			} else {
				src = 'data:image/jpeg;base64,' + Z.Utils.encodeBase64(data);		
			}

			var loadHandler;
			if (target == 'image-display') {
				loadHandler = (getStatus('imageSaving')) ? onTileLoadToSave : onTileLoad;
			} else if (target == 'image-backfill') {
				loadHandler = (getStatus('imageSaving')) ? onTileBackfillLoadToSave : onTileBackfillLoad;
			} else if (target == 'navigator') {
				loadHandler = thisViewer.Navigator.initializeNavigator;
			} else if (target == 'gallery') {
				loadHandler = thisViewer.Gallery.initializeGallery;
			}
			var func = Z.Utils.createCallback(null, loadHandler, tile);
			Z.Utils.createImageElementFromBytes(src, func);
		}

		this.parsePFFHeader = function (data) {		
			clearTierValues();

			if (typeof data !== 'undefined' && data !== null) {

				// Set key variables and constants of Zoomify Image.
				var iW = null, iH = null, tW = null, tH = null, iTileCount = null, iByteCountCount = null, iImageCount = null, iVersion = null, iHeaderSize = null, iHeaderSizeTotal = null, iMagnification = null, iFocal = null, iQuality = null;
				var version, tileSize;

				// Get PFF header values.
				version = Z.Utils.intValue(data, 8, true);
				tileSize = Z.Utils.intValue(data, 108, true);			
				var headerSize = Z.Utils.intValue(data, 116, true);			
				var offsetToJPEGHeaders = 904 + 136 + 20;	
				iHeaderSizeTotal = offsetToJPEGHeaders + headerSize;			
				iTileCount = Z.Utils.intValue(data, 124, true);	
				var debugVal = Z.Utils.intValue(data, 136, true);
				thisViewer.pffJPEGHeadersSeparate = true;
				iW = Z.Utils.intValue(data, 1052, true);
				iH = Z.Utils.intValue(data, 1056, true);
				tW = tileSize;
				tH = tileSize;

				// Debug option: Display ZIF header values.
				//console.log('Version: ' + version + ' Tile W & H: ' + tW + ' Header Size: ' + iHeaderSizeTotal + ' Tile Count: ' + iTileCount + ' Image W & H: ' + iW + ', ' + iH);

				// Call to initialize viewport unless PFF JPEG headers are separate in which case set globals here before detour to load JPEG headers.
				if (!thisViewer.pffJPEGHeadersSeparate) {
					initializeOrReinitializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);

				} else {
					thisViewer.imageW = iW;
					thisViewer.imageH = iH;
					thisViewer.imageCtrX = thisViewer.imageW / 2;
					thisViewer.imageCtrY = thisViewer.imageH / 2;
					thisViewer.imageD = Math.round(Math.sqrt(iW * iW + iH * iH));
					IMAGE_VERSION = iVersion;
					HEADER_SIZE = iHeaderSize;
					HEADER_SIZE_TOTAL = iHeaderSizeTotal;
					TILE_COUNT = iTileCount;
					TILE_WIDTH = tW;
					TILE_HEIGHT = tH;		
					var netConnector = new Z.NetConnector(thisViewer);
					netConnector.loadByteRange(imagePath, offsetToJPEGHeaders, iHeaderSizeTotal, 'jpegHeaders');
				}
			}
		}

		this.parsePFFJPEGHeaders = function (data) {
			if (typeof data !== 'undefined' && data !== null) {
				var jpegHeaderCount = Z.Utils.intValue(data, 0, true);
				var headerIndex = 4;	
				for (var i=0; i < jpegHeaderCount; i++) {
					var headerSize = Z.Utils.intValue(data, headerIndex, true);
					headerIndex += 4;		
					var headerArray = Z.Utils.dataSlice(data, headerIndex, headerIndex + headerSize);
					headerIndex += headerSize;		
					jpegHeaderArray.push(headerArray);
				}

				// PFF and JPEG headers now loaded and parsed, initialize viewport.
				initializeOrReinitializeViewport();
			}
		}

		function initializeOrReinitializeViewport (iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality) {
			// Initialize or reinitialize Viewport.
			if ((thisViewer.tileSource == 'ZoomifyPFFFile' && thisViewer.pffJPEGHeadersSeparate) || (!isNaN(iW) && iW > 0 && !isNaN(iH) && iH > 0 && !isNaN(tW) && tW > 0 && !isNaN(tH) && tH > 0 && iTileCount > 0)) {
				if (!getStatus('initializedViewport')) {
					initializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);
				} else {
					reinitializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);
				}
			} else {
				thisViewer.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESINVALID'), false, thisViewer.messageDurationStandard, 'center');
			}
		}

		this.parseImageXML = function (xmlDoc, callback) {
			parseImageXML(xmlDoc, callback);
		}

		function parseImageXML (xmlDoc, callback) {
			clearTierValues();

			if (typeof thisViewport.getStatus === 'undefined') {
				var viewportInitTimer = window.setTimeout( function () { parseImageXML(xmlDoc, callback); }, 100);
			} else {
				// Get key properties of Zoomify Image and initialize Viewport.
				var iW = null, iH = null, tW = null, tH = null, iTileCount = null, iImageCount = null, iVersion = null, iHeaderSize = null, iHeaderSizeTotal = null, iMagnification = null, iFocal = null, iQuality = null;

				if (thisViewer.tileSource == 'ZoomifyImageFolder') {
					iW = parseInt(xmlDoc.documentElement.getAttribute('WIDTH'), 10);
					iH = parseInt(xmlDoc.documentElement.getAttribute('HEIGHT'), 10);
					iTileCount = parseInt(xmlDoc.documentElement.getAttribute('NUMTILES'), 10);
					iImageCount = parseInt(xmlDoc.documentElement.getAttribute('NUMIMAGES'), 10);
					iVersion = parseInt(xmlDoc.documentElement.getAttribute('VERSION'), 10);
					tW = tH = parseInt(xmlDoc.documentElement.getAttribute('TILESIZE'), 10);
				} else if (thisViewer.tileSource == 'DZIFolder') {
					iTileCount = 1;
					iImageCount = 1;
					iVersion = 1;
					var imageNodes = xmlDoc.getElementsByTagName('Image');
					var imageFirst = imageNodes[0];
					tW = tH = parseInt(imageFirst.getAttribute('TileSize'), 10);
					var overlap = parseInt(imageFirst.getAttribute('Overlap'), 10);
					thisViewer.tileType = imageFirst.getAttribute('Format');
					var sizeNodes = imageFirst.getElementsByTagName('Size');	
					var sizeFirst = sizeNodes[0];		
					iW = parseInt(sizeFirst.getAttribute('Width'), 10);
					iH = parseInt(sizeFirst.getAttribute('Height'), 10);
				} else if (thisViewer.tileSource == 'ZoomifyPFFFile') {
					iW = parseInt(xmlDoc.documentElement.getAttribute('WIDTH'), 10);
					iH = parseInt(xmlDoc.documentElement.getAttribute('HEIGHT'), 10);
					tW = tH = parseInt(xmlDoc.documentElement.getAttribute('TILESIZE'), 10);
					iTileCount = parseInt(xmlDoc.documentElement.getAttribute('NUMTILES'), 10);
					iImageCount = parseInt(xmlDoc.documentElement.getAttribute('NUMIMAGES'), 10);
					iVersion = parseInt(xmlDoc.documentElement.getAttribute('VERSION'), 10);
					iHeaderSize = parseInt(xmlDoc.documentElement.getAttribute('HEADERSIZE'), 10);
					iHeaderSizeTotal = 904 + 136 + 20 + iHeaderSize;
				} else if (thisViewer.tileSource == 'IIIFImageServer') {
					// Allow for partial value set. All fields but image width and height will need to be internally calculated.
					iW = parseInt(xmlDoc.documentElement.getAttribute('WIDTH'), 10);
					iH = parseInt(xmlDoc.documentElement.getAttribute('HEIGHT'), 10);
					iTileCount = iImageCount = iVersion = tW = tH = null;
				} else if (thisViewer.tileSource == 'ImageServer') {
					// Allow for partial XML where submission is via zImageProperties HTML parameter
					// because in that context all fields but image width and height will be optional.
					iW = parseInt(xmlDoc.documentElement.getAttribute('WIDTH'), 10);
					iH = parseInt(xmlDoc.documentElement.getAttribute('HEIGHT'), 10);
					var tempTSz = xmlDoc.documentElement.getAttribute('TILESIZE');
					tW = (Z.Utils.stringValidate(tempTSz)) ? parseInt(tempTSz, 10) : TILE_WIDTH;
					tH = (Z.Utils.stringValidate(tempTSz)) ? parseInt(tempTSz, 10) : TILE_HEIGHT;
					var tempMag = xmlDoc.documentElement.getAttribute('MAGNIFICATION');
					iMagnification = (Z.Utils.stringValidate(tempMag)) ? parseInt(tempMag, 10) : thisViewer.sourceMagnification;
					var tempFoc = xmlDoc.documentElement.getAttribute('FOCAL');
					iFocal = (Z.Utils.stringValidate(tempFoc)) ? parseInt(tempFoc, 10) : thisViewer.focal;
					var tempQual = xmlDoc.documentElement.getAttribute('QUALITY');
					iQuality = (Z.Utils.stringValidate(tempQual)) ? parseInt(tempQual, 10) : thisViewer.quality;

					// Optional implementation: Add additional instructions here to receive image server
					// response with necessary image properties. Set values iW and iH, and also tSz if
					// tile size not 256x256 pixels for processing by remaining steps within this function.
				}

				// DEV NOTE: Optional HTML parameter custom tile dimensions override defaults, XML values, or server provided values.
				if (thisViewer.tileW !== null) { tW = thisViewer.tileW; }
				if (thisViewer.tileH !== null) { tH = thisViewer.tileH; }

				// Allow for minimal cross-domain XML and incorrectly edited image folder XML.
				if (thisViewer.tileSource == 'ZoomifyImageFolder' || thisViewer.tileSource == 'IIIFImageServer' || thisViewer.tileSource == 'ImageServer') {
					if (tW === null || isNaN(tW)) { tW = TILE_WIDTH; }
					if (tH === null || isNaN(tH)) { tH = TILE_HEIGHT; }
					if (iTileCount === null || isNaN(iTileCount)) { iTileCount = 1; }
				}

				if (!isNaN(iW) && iW > 0 && !isNaN(iH) && iH > 0 && !isNaN(tW) && tW > 0 && !isNaN(tH) && tH > 0 && iTileCount > 0) {
					if (!getStatus('initializedViewport')) {
						initializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality, callback);
					} else {
						reinitializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality, callback);
					}
				} else {
					if (thisViewer.tileSource == 'ZoomifyImageFolder') {
						thisViewer.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESXMLINVALID'), false, thisViewer.messageDurationStandard, 'center');
					} else {
						thisViewer.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESINVALID'), false, thisViewer.messageDurationStandard, 'center');
					}
				}
			}
		}

		function calculateTierValues () {
			if (thisViewer.tileSource == 'unconverted') {
				calculateTierValuesUnconvertedMethod();
			} else if (thisViewer.tileSource == 'ZoomifyZIFFile') {
				calculateTierValuesZIFMethod();
			} else {
				var tilesCounted = calculateTierValuesSecondMethod();
				if (tilesCounted != TILE_COUNT && (thisViewer.tileSource == 'ZoomifyImageFolder' || thisViewer.tileSource == 'ZoomifyZIFFile' || thisViewer.tileSource == 'ZoomifyPFFFile')) {
					tilesCounted = calculateTierValuesFirstMethod();
					if (tilesCounted != TILE_COUNT) {
						thisViewer.showMessage(Z.Utils.getResource('ERROR_IMAGETILECOUNTINVALID'), false, thisViewer.messageDurationStandard, 'center');
					}
				}
			}
		}

		function calculateTierValuesUnconvertedMethod () {
			tierWs[0] = thisViewer.imageW;
			tierHs[0] = thisViewer.imageH;
			tierWInTiles[0] = 1;
			tierHInTiles[0] = 1;
			tierTileCounts[0] = 1;
			tierCount = 1;
		}

		// ZIF files contain tier width, height, and tile counts.  Values extracted
		// in function parseZIFHeader.  Minimal additional values derived here.
		function calculateTierValuesZIFMethod () {
			for (var t = tierCount - 1; t >= 0; t--) {
				tierWInTiles[t] = Math.ceil(tierWs[t] / TILE_WIDTH);
				tierHInTiles[t] = Math.ceil(tierHs[t] / TILE_HEIGHT);
				tierTileCounts[t] = tierWInTiles[t] * tierHInTiles[t];
			}
		}

		function calculateTierValuesSecondMethod () {
			// Determine the number of tiers.
			var tempW = thisViewer.imageW;
			var tempH = thisViewer.imageH;
			while (tempW > TILE_WIDTH || tempH > TILE_HEIGHT) {
				tempW = tempW / 2;
				tempH = tempH / 2;
				tierCount++;
			}

			// Determine and record dimensions of each image tier.
			tempW = thisViewer.imageW;
			tempH = thisViewer.imageH;
			var tileCounter = 0;
			for (var t = tierCount - 1; t >= 0; t--) {
				tierWs[t] = tempW;
				tierHs[t] = tempH;
				tierWInTiles[t] = Math.ceil(tierWs[t] / TILE_WIDTH);
				tierHInTiles[t] = Math.ceil(tierHs[t] / TILE_HEIGHT);
				tierTileCounts[t] = tierWInTiles[t] * tierHInTiles[t];
				tempW = tempW / 2;
				tempH = tempH / 2;

				tileCounter += tierTileCounts[t];
			}

			// Calculate number of extra thumbnail subfolders (single jpeg) to ignore.
			if (thisViewer.tileSource == 'DZIFolder') {
				var dziThmbW = tierWs[0];
				var dziThmbH = tierHs[0];
				var dziTiersToSkip = 0;
				while (dziThmbW > 1 || dziThmbH > 1) {
					dziThmbW = dziThmbW / 2;
					dziThmbH = dziThmbH / 2;
					dziTiersToSkip++;
				}
				thisViewer.dziSubfoldersToSkip = dziTiersToSkip - 1;
			}

			// Debug option: console.log('New method: ' + tileCounter + '  ' + TILE_COUNT);
			return tileCounter;
		}

		function calculateTierValuesFirstMethod () {
			// Clear values from prior calculation attempt.
			tierWs = [];
			tierHs = [];
			tierWInTiles = [];
			tierHInTiles = [];
			tierCount = 1;

			// Determine the number of tiers.
			var pyramidType = 'DIV2';
			var tempW = thisViewer.imageW;
			var tempH = thisViewer.imageH;
			var divider = 2;
			while (tempW > TILE_WIDTH || tempH > TILE_HEIGHT) {
				if (pyramidType == 'Div2') {
					tempW = Math.floor(tempW / 2);
					tempH = Math.floor(tempH / 2);
				} else if (pyramidType == 'Plus1Div2') {
					tempW = Math.floor((tempW+1) / 2);
					tempH = Math.floor((tempH+1) / 2);
				} else {
					tempW = Math.floor(thisViewer.imageW / divider)
					tempH = Math.floor(thisViewer.imageH / divider);
					divider *= 2;
					if (tempW % 2) { tempW++; }
					if (tempH % 2) { tempH++; }
				}
				tierCount++;
			}

			// Determine and record dimensions of each image tier.
			tempW = thisViewer.imageW;
			tempH = thisViewer.imageH;
			divider = 2;
			tileCounter = 0;
			for (var t = tierCount - 1; t >= 0; t--) {
				tierWInTiles[t] = Math.floor(tempW / TILE_WIDTH);
				if (tempW % TILE_WIDTH) { tierWInTiles[t]++; }
				tierHInTiles[t] = Math.floor(tempH / TILE_HEIGHT);
				if (tempH % TILE_HEIGHT) { tierHInTiles[t]++; }
				tierTileCounts[t] = tierWInTiles[t] * tierHInTiles[t];

				tileCounter += tierTileCounts[t];

				tierWs[t] = tempW;
				tierHs[t] = tempH;
				if (pyramidType == 'Div2') {
					tempW = Math.floor(tempW / 2);
					tempH = Math.floor(tempH / 2);
				} else if (pyramidType == 'Plus1Div2') {
					tempW = Math.floor((tempW + 1) / 2);
					tempH = Math.floor((tempH + 1) / 2);
				} else {
					tempW = Math.floor(thisViewer.imageW / divider)
					tempH = Math.floor(thisViewer.imageH / divider);
					divider *= 2;
					if (tempW % 2) { tempW++; }
					if (tempH % 2) { tempH++; }
				}
			}

			// Debug option: console.log('Old method: ' + tileCounter + '  ' + TILE_COUNT);
			return tileCounter;
		}

		this.validateXYZDefaults = function (override) {
			validateXYZDefaults(override);
		}
		
		function validateXYZDefaults (override) {
			if (override) { resetParametersXYZ(thisViewer.parameters); }

			// Get default values.
			var iX = parseFloat(Z.Utils.getResource('DEFAULT_INITIALX'));
			var iY = parseFloat(Z.Utils.getResource('DEFAULT_INITIALY'));
			var iZ = parseFloat(Z.Utils.getResource('DEFAULT_INITIALZOOM'));
			var iR = parseFloat(Z.Utils.getResource('DEFAULT_INITIALR'));
			var mnZ = parseFloat(Z.Utils.getResource('DEFAULT_MINZOOM'));
			var mxZ = parseFloat(Z.Utils.getResource('DEFAULT_MAXZOOM'));
			var niX = !isNaN(iX) ? iX : null;
			var niY = !isNaN(iY) ? iY : null;
			var niZ = !isNaN(iZ) ? iZ : null;
			var niR = !isNaN(iR) ? iR : null;
			var nmnZ = !isNaN(mnZ) ? mnZ : null;
			var nmxZ = !isNaN(mxZ) ? mxZ : null;

			// Set default values for all or only specific variables, where parameters are not set.
			if (thisViewer.bookmarksGet) {
				if (!thisViewer.initialX) { thisViewer.initialX = niX; }
				if (!thisViewer.initialY) { thisViewer.initialY = niY; }
				if (!thisViewer.initialZ) { thisViewer.initialZ = niZ; }
				if (!thisViewer.initialR) { thisViewer.initialR = niR; }
				if (!thisViewer.minZ) { thisViewer.minZ = nmnZ; }
				if (!thisViewer.maxZ) { thisViewer.maxZ = nmxZ; }

			} else if (thisViewer.tileSource == 'IIIFImageServer') {
				// Calculate center for initial view using IIIF region x and y values.
				if (thisViewer.iiifRegion) {
					var regionValues = thisViewer.iiifRegion.split(',');
					var sizeValues = thisViewer.iiifSize.split(',');
					thisViewer.initialX = Math.round(parseFloat(regionValues[0]) + parseFloat(regionValues[2]) / 2);
					thisViewer.initialY = Math.round(parseFloat(regionValues[1]) + parseFloat(regionValues[3]) / 2);
					thisViewer.initialZ = Math.round((parseFloat(sizeValues[0]) / parseFloat(regionValues[2])) * 100) / 100;
					thisViewer.initialR = parseInt(thisViewer.iiifRotation, 10);
				}

			} else if (!thisViewer.parameters) {
				thisViewer.initialX = niX;
				thisViewer.initialY = niY;
				thisViewer.initialZ = niZ;
				thisViewer.initialR = niR;
				thisViewer.minZ = nmnZ;
				thisViewer.maxZ = nmxZ;

			} else {
				if (!thisViewer.parameters.zInitialX) {  thisViewer.initialX = niX; }
				if (!thisViewer.parameters.zInitialY) {  thisViewer.initialY = niY; }
				if (!thisViewer.parameters.zInitialZoom) {  thisViewer.initialZ = niZ; }
				if (!thisViewer.parameters.zInitialRotation) {  thisViewer.initialR = niR; }
				if (!thisViewer.parameters.zMinZoom) {  thisViewer.minZ = nmnZ; }
				if (!thisViewer.parameters.zMaxZoom) {  thisViewer.maxZ = nmxZ; }
			}

			// Set pan center point as default if required.
			if (thisViewer.initialX === null) { thisViewer.initialX = thisViewer.imageW / 2; }
			if (thisViewer.initialY === null) { thisViewer.initialY = thisViewer.imageH / 2; }

			// Set defaults if required.
			thisViewer.fitZ = calculateZoomToFit(null, null, 0);
			thisViewer.fillZ = calculateZoomToFill(null, null, 0);
			var currentR = (getStatus('initializedViewport')) ? thisViewport.getRotation() : thisViewer.initialR;
			var zFitR = calculateZoomToFit(null, null, currentR);
			var zFillR = calculateZoomToFill(null, null, currentR);

			// Constrain zoom-to-fit and zoom-to-fill to max zoom if set by parameter, or to 1 if viewing unconverted image.
			if (thisViewer.fitZ > 1) {
				if (thisViewer.maxZ !== null) {
					if (thisViewer.fitZ > thisViewer.maxZ) { thisViewer.fitZ = thisViewer.maxZ; }
				} else if (thisViewer.tileSource == 'unconverted') {
					thisViewer.fitZ = 1;
				}
			}
			if (thisViewer.fillZ > 1) {
				if (thisViewer.maxZ !== null) {
					if (thisViewer.fillZ > thisViewer.maxZ) { thisViewer.fillZ = thisViewer.maxZ; }
				} else if (thisViewer.tileSource == 'unconverted') {
					thisViewer.fillZ = 1;
				}
			}

			// Set min and max values if not set by parameter.
			if (thisViewer.minZ === null || thisViewer.minZ == -1) {
				thisViewer.minZ = thisViewer.fitZ;
			} else if (thisViewer.minZ == 0) {
				thisViewer.minZ = thisViewer.fillZ;
			}
			if (thisViewer.maxZ === null || thisViewer.maxZ == -1) { thisViewer.maxZ = 1; }

			// Constrain initial zoom within fit or fill, rotated fit or fill, and min and max zoom.
			if (thisViewer.initialZ === null || thisViewer.initialZ == -1) {
				thisViewer.initialZ = zFitR;
			} else if (thisViewer.initialZ == 0) {
				thisViewer.initialZ = zFillR;
			}
			if (thisViewer.initialZ < thisViewer.minZ) { thisViewer.initialZ = thisViewer.minZ; }
			if (thisViewer.initialZ > thisViewer.maxZ) { thisViewer.initialZ = thisViewer.maxZ; }
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::::: GET & SET FUNCTIONS :::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		this.getViewW = function () {
			return viewW;
		}

		this.getViewH = function () {
			return viewH;
		}

		this.getDisplayW = function () {
			return displayW;
		}

		this.getDisplayH = function () {
			return displayH;
		}

		// Support imageSet viewing.
		this.getImagePath = function () {
			return imagePath;
		}

		// Support non-imageSet viewing.
		this.setImagePath = function (value) {
			imagePath = value;
		}

		this.getViewportID = function () {
			return viewportID;
		}

		this.getTierCount = function () {
			return tierCount;
		}

		this.getTileW = function () {
			return TILE_WIDTH;
		}

		this.getTileH = function () {
			return TILE_HEIGHT;
		}

		this.getTierCurrent = function () {
			return tierCurrent;
		}

		this.getTierBackfill = function () {
			return tierBackfill;
		}

		this.getTierBackfillDynamic = function () {
			return tierBackfillDynamic;
		}

		this.getTierBackfillOversize = function () {
			return tierBackfillOversize;
		}

		this.getTierScale = function () {
			return tierScale;
		}

		this.getX = function (recalc) {
			return getX(recalc);
		}
		
		function getX (recalc) {
			var deltaX = parseFloat(cS.left) - displayL;
			var currentZ = getZoom(recalc);
			var currentX = imageX - (deltaX / currentZ);
			return currentX;
		}

		this.getY = function (recalc) {
			return getY(recalc);
		}
		
		function getY (recalc) {
			var deltaY = parseFloat(cS.top) - displayT;
			var currentZ = getZoom(recalc);
			var currentY = imageY - (deltaY / currentZ);
			return currentY;
		}

		// Returns decimal value.
		this.getZoom = function (recalc) {
			return getZoom(recalc);
		}
		
		function getZoom (recalc) {
			var tierScaleCurr = tierScale;
			if (recalc) { tierScaleCurr = tierScale * parseFloat(vS.width) / displayW; }
			var currentZ = convertTierScaleToZoom(tierCurrent, tierScaleCurr);
			return currentZ;
		}

		// DEV NOTE: Returns stored value rather than current value. Processing of CSS tranform matrix in development.
		// Needed for general access and for comparison viewing when viewports not sync'd.
		this.getRotation = function (recalc) {
			return thisViewer.imageR;
		}

		this.getCoordinates = function () {
			var currentCoords = new Z.Utils.Point(getX(), getY());
			return currentCoords;
		}

		this.getCoordinatesBookmark = function (recalc, iiifProtocol) {
			var bookmarkQueryString = '';
			if (iiifProtocol) {
				bookmarkQueryString = '?' + thisViewport.getViewCoordinatesIIIFString(recalc, null, 'bookmark');
			} else {
				bookmarkQueryString = '?' + thisViewport.getViewCoordinatesString(recalc);
			}
			return bookmarkQueryString;
		}

		this.getViewCoordinatesString = function (recalc) {
			var xStr = 'x=' + Math.round(getX(recalc)).toString();
			var yStr = '&y=' + Math.round(getY(recalc)).toString();
			var zStr = '&z=' + Math.round(getZoom(recalc) * 100).toString();
			var r = Math.round(thisViewport.getRotation(recalc));
			var rStr = (r == 0) ? '' : '&r=' + r.toString();
			var coordsString = xStr + yStr + zStr + rStr;
			return coordsString;
		}

		this.getCoordinatesFull = function (recalc) {
			return new Z.Utils.Coordinates(getX(recalc), getY(recalc), getZoom(recalc), thisViewport.getRotation(recalc));
		}

		this.getCoordinatesDisplayFull = function () {
			return new Z.Utils.CoordinatesDisplayStyle(cS.left, cS.top, vS.width, vS.height, vS.left, vS.top, bS.width, bS.height, bS.left, bS.top, cS.rotation);
		}

		this.getTiersScaleUpMax = function () {
			return TIERS_SCALE_UP_MAX;
		}

		this.getTiersScaleDownMax = function () {
			return TIERS_SCALE_DOWN_MAX;
		}

		this.getTilesCacheMax = function () {
			return TILES_CACHE_MAX;
		}

		this.getTierWs = function () {
			return tierWs.join(',');
		}

		this.getTierHs = function () {
			return tierHs.join(', ');
		}

		this.getTierTileCounts = function () {
			return tierTileCounts.join(', ');
		}

		this.getTilesToLoad = function () {
			return tilesToLoadTotal;
		}

		this.getTilesLoadingNames = function () {
			var tilesLoading = (tilesLoadingNames.join(', ') == '') ? 'Current view loading complete' : tilesLoadingNames.join(', ');
			return tilesLoading;
		}

		// Progress functions track tiles to display, load, etc. Tiles 'waiting' are loaded but not displayed, therefore, not drawn.
		this.getTilesToDraw = function () {
			return tilesWaiting;
		}

		this.getConstrainPan = function (value) {
			return thisViewer.constrainPan;
		}

		this.setConstrainPan = function (value) {
			thisViewer.constrainPan = (value != '0');
			thisViewer.constrainPanLimit = parseInt(value, 10);
			thisViewer.constrainPanStrict = (value == '3');
			if (thisViewer.constrainPan) { thisViewport.toggleConstrainPan(true); }
		}

		this.getSmoothPan = function () {
			return thisViewer.smoothPan;
		}

		this.setSmoothPan = function (value) {
			thisViewer.smoothPan = value;
		}

		this.getSmoothPanEasing = function () {
			return thisViewer.smoothPanEasing;
		}

		this.setSmoothPanEasing = function (value) {
			thisViewer.smoothPanEasing = value;
		}

		this.getSmoothPanGlide = function () {
			return thisViewer.smoothPanGlide;
		}

		this.setSmoothPanGlide = function (value) {
			thisViewer.smoothPanGlide = value;
		}

		this.getSmoothZoom = function () {
			return thisViewer.smoothZoom;
		}

		this.setSmoothZoom = function (value) {
			thisViewer.smoothZoom = value;
		}

		this.getSmoothZoomEasing = function () {
			return thisViewer.smoothZoomEasing;
		}

		this.setSmoothZoomEasing = function (value) {
			thisViewer.smoothZoomEasing = value;
		}

		this.setCoordinatesDisplayVisibility = function (visible) {
			if (visible) {
				Z.Utils.addEventListener(document, 'mousemove', displayEventsCoordinatesHandler);
				Z.Utils.addEventListener(document, 'mousedown', displayEventsCoordinatesHandler);
			} else {
				thisViewer.coordinatesVisible = false;
				Z.Utils.removeEventListener(document, 'mousemove', displayEventsCoordinatesHandler);
				Z.Utils.removeEventListener(document, 'mousedown', displayEventsCoordinatesHandler);
			}
		}

		this.setTourPath = function (tourPath, noReload) {
			thisViewport.setHotspotPath(tourPath, noReload);
		}

		this.setHotspotPath = function (hotspotPath, noReload) {
			if (typeof hotspotPath !== 'undefined' && !Z.Utils.stringValidate(hotspotPath)) {
				thisViewer.hotspotPath = null;
				thisViewer.hotspotFolder = null;
				thisViewport.deleteAllHotspots();
			} else {
				thisViewer.hotspotPath = Z.Utils.stringRemoveTrailingSlashCharacters(hotspotPath);
				thisViewer.hotspotFolder = thisViewer.hotspotPath;
				if (thisViewer.hotspotPath.toLowerCase().substring(thisViewer.hotspotPath.length - 4, thisViewer.hotspotPath.length) == '.xml') {
					thisViewer.hotspotFolder = thisViewer.hotspotFolder.substring(0, thisViewer.hotspotFolder.lastIndexOf('/'));
				}
				if (!noReload) {
					thisViewport.deleteAllHotspots();
					loadHotspotsOrAnnotationsData(viewportID);
				}
			}
		}

		this.getHotspotCurrentID = function () {
			return hotspotCurrentID;
		}

		this.getHotspotCurrentIDExternal = function () {
			var currIDInt = thisViewport.getHotspotCurrentID();
			currIDExt = hotspots[currIDInt].id;
			return currIDExt;
		}

		this.getHotspots = function () {
			return hotspots;
		}

		this.setHotspots = function (hotsArr) {
			hotspots = hotsArr.slice(0);
		}

		this.setAnnotationPath = function (annotationPath, noReload) {
			if (typeof annotationPath === 'undefined' || !Z.Utils.stringValidate(annotationPath)) {
				thisViewer.annotationPath = null;
				thisViewer.annotationFolder = null;
				thisViewport.deleteAllAnnotations();
				thisViewer.annotations = false;
			} else {
				thisViewer.annotationPath = Z.Utils.stringRemoveTrailingSlashCharacters(annotationPath);
				thisViewer.annotationFolder = thisViewer.annotationPath;
				var annotPathLower = thisViewer.annotationPath.toLowerCase();
				if ((annotPathLower.substring(thisViewer.annotationPath.length - 5, thisViewer.annotationPath.length) != '.json') && (annotPathLower.substring(thisViewer.annotationPath.length - 4, thisViewer.annotationPath.length) != '.xml')) {
					thisViewer.annotationPath = thisViewer.annotationPath + '/' + Z.Utils.getResource('DEFAULT_ANNOTATIONSXMLFILE');
				}
				if (annotPathLower.substring(thisViewer.annotationPath.length - 4, thisViewer.annotationPath.length) == '.xml') {
					thisViewer.annotationFolder = thisViewer.annotationFolder.substring(0, thisViewer.annotationFolder.lastIndexOf('/'));
				}
				thisViewer.annotations = true;
				if (!noReload) {
					thisViewport.deleteAllAnnotations();
					loadHotspotsOrAnnotationsData(viewportID);
				}
			}
		}

		this.getAnnotationsXML = function () {
			annotationsXML = updateAnnotationsXML(annotationsXML);
			return annotationsXML;
		}

		this.setAnnotationsXML = function (annotsXML) {
			annotationsXML = annotsXML;
		}

		// Debug option: Call this from function buttonEventsManager.
		this.testSetAnnotationPath = function () {
			thisViewport.setAnnotationPath('Assets/Annotations/annotations2.xml');
		}

		this.setXMLCallbackFunction = function (xmlParsingFunction) {
			thisViewer.xmlCallbackFunction = xmlParsingFunction;
		}

		this.setLabelsClickDrag = function (draggable) {
			thisViewer.labelsClickDrag = draggable;
		}

		// Support imageSet viewing.
		this.setVisibility = function (visible) {
			visibility(visible);
		}

		// Support imageSet viewing.
		function visibility (visible) {
			var dispValue = (visible) ? 'inline-block' : 'none';
			if (oversizeDisplay && !oS) { oS = oversizeDisplay.style; }
			if (oS) { oS.display = dispValue; }
			if (viewportContainer && !cS) { cS = viewportContainer.style; }
			if (cS) { cS.display = dispValue; }
		}

		// Support overlays. Ensure value is between 0 and 1. If far over 1 assume entered as range 1 to 100 and correct.
		this.setOpacity = function (percentage) {
			percentage = (percentage >= 2) ? (percentage / 100) : (percentage < 0) ? 0 : (percentage > 1) ? 1 : percentage;
			Z.Utils.setOpacity(viewportContainer, percentage);
		}

		this.showLists = function (visible) {
			var visValue = (visible) ? 'visible' : 'hidden';
			if (imageList) {
				thisViewport.setImageListVisibilty(visValue);
				if (thisViewer.comparison) { thisViewer.Viewport1.setImageListVisibilty(visValue); }
			}
			if (thisViewer.hotspots) { setVisibilityHotspotChoiceList(visible, viewportID.toString()); }
			if (slideList) { slideList.style.visibility = visValue; }
			if (thisViewer.imageSet && !thisViewer.comparison) { thisViewer.setVisibilityImageSetChoiceList(visible); }
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::::::: CORE FUNCTIONS ::::::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		// Precache backfill tiers to ensure fast low-res background. Delay some precaching to speed image set display.
		// Variable tierBackfill is reset during navigation but precached tiles anticipate possible values based on image and viewing type.
		this.precacheBackfillTiles = function (delayed) {
			selectBackfillTier();

			if (!delayed) {
				precacheTierTileNames(backfillChoice0, tilesBackfillCachedNames);
				backfillTresholdCached0 = true;
			}

			// Precache if tiers require it and if already delayed precaching or if not multiple Viewers or images.
			if (tierCount > backfillTreshold1 && (delayed || (!Z.multipleViewers || (!thisViewer.imageSet || thisViewer.comparison || vpID == thisViewer.imageSetStart)))) {
				precacheTierTileNames(backfillChoice1, tilesBackfillCachedNames);
				backfillTresholdCached1 = true;
				if (tierCount > backfillTreshold2) {
					precacheTierTileNames(backfillChoice2, tilesBackfillCachedNames);
					backfillTresholdCached2 = true;
				}
				setStatus('backfillPrecachedViewport', true);
			}

			tilesBackfillCachedNames.sort();
			tilesBackfillCachedNames = Z.Utils.arrayUnique(tilesBackfillCachedNames);
			tilesBackfillDisplayingNames = tilesBackfillCachedNames.slice(0);

			traceDebugValues('tilesBackfillToPrecache', null, tilesBackfillDisplayingNames.length);
			loadNewTiles(tilesBackfillCachedNames, onTileBackfillLoad, 'simple', 'image-backfill');
		}

		function precacheTierTileNames (tier, cacheArr) {
			var tierColumnR = tierWInTiles[tier] - 1;
			var tierRowB = tierHInTiles[tier] - 1;
			for (var columnCntr = 0; columnCntr <= tierColumnR; columnCntr++) {
				for (var rowCntr = 0; rowCntr <= tierRowB; rowCntr++) {
					cacheArr[cacheArr.length] = tier + '-' + columnCntr + '-' + rowCntr;
				}
			}
		}

		this.preloadTiles = function (draw) {
			if (thisViewer.imageSet) {
				var msgTxt = (thisViewer.animation) ? Z.Utils.getResource('ALERT_PRELOADINGIMAGESET-LOADINGTILESIMAGES') : Z.Utils.getResource('ALERT_PRELOADINGIMAGESET-LOADINGTILESSLIDES');
				thisViewer.showMessage(msgTxt, false, thisViewer.messageDurationLong, 'center');
				thisViewport.updateView(true, true);
			} else {
				thisViewer.showMessage(Z.Utils.getResource('ALERT_PRELOADINGONEIMAGE-LOADINGTILES'), false, thisViewer.messageDurationLong, 'center');
				Z.Utils.arrayClear(tilesLoadingNames);
				for (var i = 0, j = tierCount; i < j; i++) {
					var bBox = getViewportDisplayBoundingBoxInTiles(i, null, true, true);
					for (var columnCntr = bBox.l, tR = bBox.r; columnCntr <= tR; columnCntr++) {
						for (var rowCntr = bBox.t, tB = bBox.b; rowCntr <= tB; rowCntr++) {
							var tileName = i + '-' + columnCntr + '-' + rowCntr;
							tilesLoadingNames[tilesLoadingNames.length] = tileName;
						}
					}
				}
				if (tilesLoadingNames.length > 0 ) {
					var loadStart = new Date().getTime();
					for (var i = 0, j = tilesLoadingNames.length; i < j; i++) {
						var tileName = tilesLoadingNames[i];
						if (tileName) {
							var tile = new Tile(tileName, 'image-display');
							loadTile(tile, loadStart, onTileLoad);
						}
					}
				}
			}
		}

		function updateViewWhilePanning (stepX, stepY) {
			// Streamlined version of updateView code (which is called in full form on pan end).
			// DEV NOTE: Updating tiles while panning disabled. Requires optimization.
		}

		// Main drawing function called after every change of view.  First reposition and rescale backfill, viewport and related
		// displays to transfer any panning and/or scaling from container and CSS values to canvas or tile image values.
		this.updateView = function (override, preloading) {
			updateView(override, preloading);
		}
		
		function updateView (override, preloading) {			
			if (typeof vpID === 'undefined' || vpID === null) { vpID = 0; }

			// If switching comparison viewports and not sync'd, ensure globals not sync'd.
			if (vpID != thisViewer.viewportCurrentID && !override) {
				var viewportComp = thisViewer['Viewport' + vpID.toString()];
				thisViewer.imageX = viewportComp.getX(true);
				thisViewer.imageY = viewportComp.getY(true);
				thisViewer.imageZ = viewportComp.getZoom(true);
				thisViewer.imageR = viewportComp.getRotation(true);
			}

			// Get values to ensure action is needed and for callback validation at completion of function.
			var userInteracting = (thisViewer.mouseIsDown || thisViewer.buttonIsDown || thisViewer.keyIsDown || thisViewer.mouseWheelIsDown);
			var viewZoomed = (tierScale != tierScalePrior || getZoom() != thisViewer.imageZ || thisViewer.imageZ != thisViewer.priorZ);
			var viewPanned = (parseFloat(cS.left) != displayL || parseFloat(cS.top) != displayT || getX() != thisViewer.imageX || getY() != thisViewer.imageY);
			var viewFullExiting = thisViewer.fullViewPrior;

			if (viewZoomed || viewPanned || viewFullExiting || (typeof override !== 'undefined' && override && (!userInteracting || thisViewer.animation)) || (typeof preloading !== 'undefined' && preloading) || thisViewer.imageFilters == 'external') {

				// Record prior X, Y, Z, and R values.
				recordPriorViewCoordinates();

				var changeBuffer = 1; // Update current viewport backfill, and if viewing imageSet, backfill for viewports before and after.
				if (thisViewer.comparison || thisViewer.overlays || !thisViewer.imageSet || !thisViewer.getStatus('readyViewer') || (vpID > thisViewer.viewportCurrentID - changeBuffer && vpID < thisViewer.viewportCurrentID + changeBuffer) || preloading) {

					// Recenter position of container of displays and reset any scaling of canvases or
					// tile image elements. This prepares all objects for new content.
					resetDisplays(override);

					// If zooming, change viewport and backfill tiers if necessary.
					var delayClear = false;

					if ((typeof override !== 'undefined' && override) || tierScale != tierScalePrior || getZoom() != thisViewer.imageZ || !thisViewer.getStatus('initializedViewport') || preloading) {
						selectTier();
						if (thisViewer.tileSource != 'unconverted') {
							selectBackfillTier();
							redisplayCachedTiles(bD, tierBackfill, tilesBackfillCached, 'simple', false, '2. Updating view: changing tier - backfill');
						}
						if (!override && TILES_CACHE_MAX > 0) { delayClear = true; }
					} else {
						traceDebugValues('updateView-noChange');
					}

					// If zooming or panning, refill viewport with cached tiles or load new tiles. However, if no new tiles needed and convolution filter applied then tiles
					// have been drawn to temp canvas from cache and must now be filtered as one data object and then drawn to viewport display canvas.
					if (thisViewer.tileSource != 'unconverted' && tierBackfillDynamic) {
						selectTiles(true);
					} else {
						if (oD) { Z.Utils.clearDisplay(oD, thisViewer); }
					}
				}

				// Update current viewport frontfill, even if viewing imageSet. Also update second viewport if comparison viewing.
				if (vpID == thisViewer.viewportCurrentID || thisViewer.comparison || thisViewer.overlays || !thisViewer.imageSet || preloading) {

					if (thisViewer.tileSource != 'unconverted') {
						selectTiles();
						redisplayCachedTiles(vD, tierCurrent, null, 'centerOut', delayClear, '3. Updating view: prior to loading of any new tiles');

					} else if (typeof unconvertedImage !== 'undefined') {
						var x = -thisViewer.imageX;
						var y = -thisViewer.imageY;
						Z.Utils.clearDisplay(vD, thisViewer);
						vCtx.drawImage(unconvertedImage, x, y);

						// No tile loading for unconverted image so signal update completion here.
						setStatus('displayLoadedViewport', true);
						setStatus('displayDrawnViewport', true);
						validateCallback('viewUpdateComplete');
						validateCallback('viewUpdateCompleteGetLabelIDs');
					}

					if (thisViewer.maskingSelection) { updateMask(); }

					if (tilesLoadingNames.length > 0) {
						loadNewTiles(tilesLoadingNames, onTileLoad, 'centerOut', 'image-display');
					}

					// Update related displays and components.
					var comparisonSync = (thisViewer.comparison && vpID == thisViewer.viewportCurrentID);
					var overlaySync = (thisViewer.overlays && vpID == thisViewer.viewportCurrentID);
					var bookmarksSync = thisViewer.bookmarksSet;
					var trackingSync = thisViewer.tracking;
					syncViewportRelated(true, true, true, true, true, true, comparisonSync, overlaySync, bookmarksSync, trackingSync);

				} else {
					// Override default false status for viewports other than starting viewport.
					setStatus('displayLoadedViewport', true);
					setStatus('displayDrawnViewport', true);
				}

				if (preloading) {
					var imageSetLen = (thisViewer.imageSetLength !== null) ? thisViewer.imageSetLength.toString() : '';
					var statusCounterStr = (thisViewport.getViewportID() + 1).toString() + ' of ' + imageSetLen;
					var msgTxt = (thisViewer.animation) ? Z.Utils.getResource('ALERT_PRELOADINGIMAGESET-UPDATINGVIEWIMAGES') : Z.Utils.getResource('ALERT_PRELOADINGIMAGESET-UPDATINGVIEWSLIDES');
					thisViewer.showMessage(msgTxt + '  ' + statusCounterStr, false, thisViewer.messageDurationLong, 'center');
				}

				// Validate all view change callbacks.
				if (viewPanned) { validateCallback('viewPanned'); }
				if (viewZoomed) { validateCallback('viewZoomed'); }
				if (viewPanned || viewZoomed) { validateCallback('viewChanged'); }

				// Debug option: console.log(thisViewer.viewportCurrent.getLabelIDsInCurrentView(true, true, true));
			}
		}

		function resetDisplays (override) {
			// If display scaled or panned, reset scale and position to maintain container center
			// point and adjust current tiles to offset change and fill view while new tiles load.
			var redisplayRequired = false;

			// Test for scaling to reset.
			if (override || parseFloat(vS.width) != vD.width) {

				if (thisViewer.useCanvas) {
					// Reset viewport display by returning to start values and reset viewport canvas then transfer CSS scaling to internal canvas scale.
					vS.width = vD.width + 'px';
					vS.height = vD.height + 'px';
					vS.left = '0px';
					vS.top = '0px';
					vCtx.restore();
					vCtx.save();

					// Trap possible NS_ERROR_FAILURE error especially in firefox especially if working with large unconverted image.
					// DEV NOTE: Add retry or soft fail in catch in future implementation for firefox issue with large canvases.
					try {
						vCtx.scale(tierScale, tierScale);
					} catch (e) {
						thisViewer.showMessage(Z.Utils.getResource('ERROR_SCALINGCANVASFORUNCONVERTEDIMAGE'));
						console.log('In function resetDisplays scaling canvas:  ' + e);
					}

					// Sync mask canvas.
					if (mC) {
						mS.width = vD.width + 'px';
						mS.height = vD.height + 'px';
						mS.left = '0px';
						mS.top = '0px';
					}

					// Sync drawing canvas.
					if (dD) {
						dS.width = dD.width + 'px';
						dS.height = dD.height + 'px';
						dS.left = '0px';
						dS.top = '0px';
					}

					// Sync editing canvas.
					if (eD) {
						eS.width = eD.width + 'px';
						eS.height = eD.height + 'px';
						eS.left = '0px';
						eS.top = '0px';
					}

					// Backfill display resized and rescaled depending on whether display is dynamic and partially filled or static and complete as determined in function selectBackfillTier.
					// Backfill positioning and offsetting occurs below. Scaling occurs in the scaleTierToZoom or redisplayCachedTiles functions depending on whether backfill display is
					// implemented as a canvas or HTML div. Oversize backfill display, if present, is always implemented as a canvas as redraw must be fast to provide benefit.
					if (bD) {
						if (tierBackfillDynamic) {
							// Reset backfill display by returning to start values and reset backfill canvas then transfer CSS scaling to internal canvas scale.
							bS.width = bD.width + 'px';
							bS.height = bD.height + 'px';
							bS.left = backfillL + 'px';
							bS.top = backfillT + 'px';
							bCtx.restore();
							bCtx.save();
							bCtx.scale(tierBackfillScale, tierBackfillScale);
						} else {
							bS.width = backfillW + 'px';
							bS.height = backfillH + 'px';
							bS.left = backfillL + 'px';
							bS.top = backfillT + 'px';
						}
					}

				}
				// No 'else' clause here for non-canvas browsers because scaling occurs in the
				// drawTileInHTML function based on tierScale passed in by displayTile. The
				// dimensions of the displays are unimportant as the tiles are drawn to overflow.
				// The positions of the displays are set below where panning changes are reset.

				redisplayRequired = true;
			}

			// Test for panning to reset.  Update imageX and imageY to offset so that
			// when tiles are redrawn they will be in the same position in the view.
			if (override || parseFloat(cS.left) != displayL || parseFloat(cS.top) != displayT) {

				// Calculate pan change in position.
				var deltaX = parseFloat(cS.left) - displayL;
				var deltaY = parseFloat(cS.top) - displayT;

				// Correct coordinates for mouse-panning.
				if (thisViewer.imageR != 0) {
					var deltaPt = Z.Utils.rotatePoint(deltaX, deltaY, thisViewer.imageR);
					deltaX = deltaPt.x;
					deltaY = deltaPt.y;
				}

				// Recenter viewport display.
				cS.left = displayL + 'px';
				cS.top = displayT + 'px';

				// Reset backfill tracking variables and reposition backfill display to offset container recentering. Backfill will not
				// be redrawn in the redisplayRequired clause below. If tierBackfillDynamic, full reset occurs in function selectBackfillTier.
				if (!tierBackfillDynamic) {
					backfillL = (parseFloat(bS.left) + deltaX);
					backfillT = (parseFloat(bS.top) + deltaY);
					bS.left = backfillL + 'px';
					bS.top = backfillT + 'px';
				}

				// Update coordinates values to offset.
				var currentZ = getZoom();
				thisViewer.imageX = imageX = thisViewer.imageX - (deltaX / currentZ);
				thisViewer.imageY = imageY = thisViewer.imageY - (deltaY / currentZ);

				redisplayRequired = true;
			}

			if (redisplayRequired) {
				redisplayCachedTiles(vD, tierCurrent, tilesCached, 'centerOut', false, '1a. Updating view: resetting display positions');
				if (thisViewer.maskingSelection && mC) { displayMask(); }
				if (tierBackfillDynamic) { redisplayCachedTiles(bD, tierBackfill, tilesBackfillCached, 'simple', false, '1b. Updating view: resetting backfill positions'); }
			}
		}

		function selectTier () {

			// If tier has been scaled translate scaling to zoom tracking variable.
			if (tierScale != tierScalePrior) { thisViewer.imageZ = getZoom(); }

			// Prevent infinite loop on constraint failure in case of JS timing errors.
			if (thisViewer.imageZ < thisViewer.minZ) { thisViewer.imageZ = thisViewer.minZ; }
			if (thisViewer.imageZ > thisViewer.maxZ) { thisViewer.imageZ = thisViewer.maxZ; }

			// Determine best image tier and scale combination for intended zoom.
			var calcZ = TIERS_SCALE_UP_MAX;
			var tierTarget = tierCount;
			while(tierTarget > 0 && calcZ / 2 >= thisViewer.imageZ) {
				tierTarget--;
				calcZ /= 2;
			}
			tierTarget = (tierTarget - 1 < 0) ? 0 : tierTarget - 1; // Convert to array base 0.
			var tierScaleTarget = convertZoomToTierScale(tierTarget, thisViewer.imageZ);

			// If zooming, apply new tier and scale calculations.  No steps required here for the
			// drawing canvas as its scale does not change, only the control point coordinates do.
			if (tierTarget != tierCurrent || tierScaleTarget != tierScale) {
				if (thisViewer.useCanvas) {
					vCtx.restore();
					vCtx.save();
					vCtx.scale(tierScaleTarget, tierScaleTarget);
				}
				// No steps required here for non-canvas browsers because scaling occurs
				// in drawTileInHTML function based on tierScale passed in by displayTile.

				// Reset tier and zoom variables.
				if (tierCurrent != tierTarget) { tierChanged = true; }
				tierCurrent = tierTarget;
				tierScale = tierScaleTarget;
			}
			tierScalePrior = tierScale;
		}

		function selectBackfillTier () {
			// Use high backfill tier behind high frontfill tiers to avoid blurry backfill when panning at full zoom. Use 0 backfill tier
			// behind low frontfill tiers to avoid tiles gaps lining up. Backfill tiles for tiers 0 to 3 are precached (depending on total
			// image tiers) in precacheBackfillTiles in initializeViewport or reinitializeViewport and then loaded in redisplayCachedTiles
			// in updateView. Deep zoom on large images will force dynamic loading and positioning of backfill tiles.
			tierBackfillDynamic = false;
			tierBackfill = 0;
			if (tierCurrent > backfillTreshold3) {
				tierBackfill = tierCurrent - backfillDynamicAdjust;
				tierBackfillDynamic = true;
			} else {
				tierBackfill = (tierCurrent > backfillTreshold2) ? backfillChoice2 : (tierCurrent > backfillTreshold1) ? backfillChoice1 : backfillChoice0;
			}

			tierBackfillScale = convertZoomToTierScale(tierBackfill, thisViewer.imageZ);
			tierBackfillScalePrior = tierBackfillScale;

			var tierBackfillW = tierWs[tierBackfill];
			var tierBackfillH = tierHs[tierBackfill];

			// Convert current pan position from image values to tier values.
			var deltaX = thisViewer.imageX * thisViewer.imageZ;
			var deltaY = thisViewer.imageY * thisViewer.imageZ;

			// Set backfill globals for use during fast scaling then set backfill display dimensions and position. If backfill is dynamic, no steps
			// required for non-canvas browsers because scaling occurs in drawTileInHTML function based on tierScale passed in by displayTile.
			if (tierBackfillDynamic) {
				var buffer = BACKFILL_BUFFER;
				backfillW = displayW * buffer;
				backfillH = displayH * buffer;
				backfillL = -(displayW / buffer);
				backfillT = -(displayH / buffer);
				backfillCtrX = displayCtrX * buffer;
				backfillCtrY = displayCtrY * buffer;
				bD.width = backfillW;
				bD.height = backfillH;
				bS.width = bD.width + 'px';
				bS.height = bD.height + 'px';
				bS.left = backfillL + 'px';
				bS.top = backfillT + 'px';
				if (thisViewer.useCanvas) {
					if (oD) {
						tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, thisViewer.imageZ);
						oCtx.restore();
						oCtx.save();
						oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
						if (thisViewer.imageR != 0) {
							oCtx.rotate(thisViewer.imageR * Math.PI / 180);
						}
					}
					bCtx.restore();
					bCtx.translate(backfillCtrX, backfillCtrY);
					bCtx.save();
					bCtx.scale(tierBackfillScale, tierBackfillScale);
				}

			} else {
				// Set backfill globals for use during fast scaling then set backfill display dimensions and position.
				backfillW = tierBackfillW * tierBackfillScale;
				backfillH = tierBackfillH * tierBackfillScale;
				backfillL = (displayCtrX - deltaX);
				backfillT = (displayCtrY - deltaY);
				bD.width = tierBackfillW;
				bD.height = tierBackfillH;
				if (thisViewer.useCanvas) {
					bS.width = backfillW + 'px';
					bS.height = backfillH + 'px';
				}
				bS.left = backfillL + 'px';
				bS.top = backfillT + 'px';
			}
		}

		// Calculate tiles at edges of viewport for current view then store names of tiles in view. Identify
		// required tiles that have not been previously loaded. Identify tiles needed for current view that
		// have been previously loaded. Remove previously loaded tile names to allow redisplay rather
		// than reload. Update loading tracking variable and also progress display if enabled. Remove
		// and re-add previously loaded tile names to promote so as to avoid clearing on cache validation.
		// Clear collection of tiles in current view before it is refilled in onTileLoad function. First ensure
		// all tiles' alpha values are set to 1 for drawing in progress and future use from cache. Implement
		// for backfill only if backfill is partially filled rather than completely precached due to the size of
		// the total image and the degree of current zoom.
		function selectTiles (backfill) {
			if (!backfill) {
				// Clear tracking lists.
				Z.Utils.arrayClear(tilesDisplayingNames);
				Z.Utils.arrayClear(tilesCachedInView);
				Z.Utils.arrayClear(tilesCachedInViewNames);
				Z.Utils.arrayClear(tilesLoadingNames);

				// Determine edge tiles of view.
				var bBox = getViewportDisplayBoundingBoxInTiles();

				// Determine tiles in view.
				for (var columnCntr = bBox.l, tR = bBox.r; columnCntr <= tR; columnCntr++) {
					for (var rowCntr = bBox.t, tB = bBox.b; rowCntr <= tB; rowCntr++) {
						var tileName = tierCurrent + '-' + columnCntr + '-' + rowCntr;
						tilesDisplayingNames[tilesDisplayingNames.length] = tileName;
						tilesLoadingNames[tilesLoadingNames.length] = tileName;
					}
				}

				// If current tier matches a precached backfill tier determine cached backfill tiles useful for frontfill and remove from loading list. Backfill tiles also in frontfill will be used in function onTileLoad called by onTileBackfillLoad.
				if (getStatus('initializedViewport') && tilesBackfillCached.length > 0 && (tierCurrent == backfillChoice0 || tierCurrent == backfillChoice1 || tierCurrent == backfillChoice2)) {
					for (var i = 0, j = tilesBackfillCached.length; i < j; i++) {
						var tile = tilesBackfillCached[i];
						if (tile && tile.t == tierCurrent && tile.c >= bBox.l && tile.c <= bBox.r && tile.r >= bBox.t && tile.r <= bBox.b) {
							tilesCachedInViewNames[tilesCachedInViewNames.length] = tile.name;
							tilesCachedInView[tilesCachedInView.length] = tile;
							var index = Z.Utils.arrayIndexOf(tilesLoadingNames, tile.name);
							if (index != -1) { tilesLoadingNames = Z.Utils.arraySplice(tilesLoadingNames, index, 1); }
						}
					}
				}

				// Determine cached frontfill tiles in view and remove from loading list. Backfill tiles also in frontfill will be used in function onTileLoad called by onTileBackfillLoad.
				for (var i = 0, j = tilesCached.length; i < j; i++) {
					var tile = tilesCached[i];
					if (tile && tile.t == tierCurrent && tile.c >= bBox.l && tile.c <= bBox.r && tile.r >= bBox.t && tile.r <= bBox.b) {
						var index = Z.Utils.arrayIndexOf(tilesCachedInViewNames, tile.name);
						if (index == -1) {
							tilesCachedInViewNames[tilesCachedInViewNames.length] = tile.name;
							tilesCachedInView[tilesCachedInView.length] = tile;
						}
						var index2 = Z.Utils.arrayIndexOf(tilesLoadingNames, tile.name);
						if (index2 != -1) { tilesLoadingNames = Z.Utils.arraySplice(tilesLoadingNames, index2, 1); }
					}
				}

				// Fully fade-in cached tiles in view and clear lists.
				if (tilesLoadingNamesLength != 0) {
					for (var i = 0, j = tilesInView.length; i < j; i++) {
						var tile = tilesInView[i];
						tile.alpha = 1;
					}
					Z.Utils.arrayClear(tilesInView);
					Z.Utils.arrayClear(tilesInViewNames);
				}

				// Track progress.
				tilesToLoadTotal = tilesLoadingNames.length;

				// Trace progress.
				traceDebugValues('tilesToDisplay', null, tilesDisplayingNames.length, tilesDisplayingNames);
				traceDebugValues('tilesInCache', null, tilesCachedInViewNames.length, tilesCachedInViewNames);
				traceDebugValues('tilesToLoad', null, tilesLoadingNames.length, tilesLoadingNames);

			} else {
				var bBox = getViewportDisplayBoundingBoxInTiles(tierBackfill);
				Z.Utils.arrayClear(tilesBackfillCachedNames);
				Z.Utils.arrayClear(tilesBackfillDisplayingNames);
				for (var columnCntr = bBox.l, tR = bBox.r; columnCntr <= tR; columnCntr++) {
					for (var rowCntr = bBox.t, tB = bBox.b; rowCntr <= tB; rowCntr++) {
						var tileName = tierBackfill + '-' + columnCntr + '-' + rowCntr;
						tilesBackfillDisplayingNames[tilesBackfillDisplayingNames.length] = tileName;
						tilesBackfillCachedNames[tilesBackfillCachedNames.length] = tileName;
					}
				}

				// Track progress.
				loadNewTiles(tilesBackfillCachedNames, onTileBackfillLoad, 'simple', 'image-backfill');
			}					
		}

		function redisplayCachedTiles (display, tier, cacheArray, drawMethod, delayClear, purpose) {
			// If using canvas browser, display content of temporary transition canvas while display canvas
			// is updated. In non-canvas browsers, draw directly to display, optionally using
			// center-out order. Clear tiles previously drawn or wait until all tiles load - per parameter.
			if (!delayClear) { Z.Utils.clearDisplay(display, thisViewer); }

			if (drawMethod == 'canvasCopy') {
				Z.Utils.clearDisplay(vD, thisViewer);
				vCtx.restore();
				vCtx.save();
				vCtx.scale(1, 1);
				vCtx.drawImage(tC, -displayCtrX, -displayCtrY);
				vCtx.restore();
				vCtx.save();
				vCtx.scale(tierScale, tierScale);		

			} else {
				// Calculate tiles at edges of viewport display for current view.
				var bBox = getViewportDisplayBoundingBoxInTiles(tier);
				var cacheArrayInView = [];

				// Determine cached tiles in view.
				if (cacheArray === null) {
					for (var i = 0, j = tilesCachedInView.length; i < j; i++) {
						cacheArrayInView[i] = tilesCachedInView[i];
					}
				} else if (cacheArray.length > 0) {
					for (var i = 0, j = cacheArray.length; i < j; i++) {
						var tile = cacheArray[i];
						// Filter list to tile in view unless backfill and not tierBackfillDynamic.
						if (tile && tile.t == tier && ((tier == tierBackfill && !tierBackfillDynamic) || (tile.c >= bBox.l && tile.c <= bBox.r && tile.r >= bBox.t && tile.r <= bBox.b))) {
							cacheArrayInView[cacheArrayInView.length] = cacheArray[i];
						}
					}
				}

				if (cacheArrayInView.length > 0) {

					traceDebugValues('redisplayCachedTiles-' + display.id, null, null, cacheArrayInView);

					if (drawMethod == 'centerOut') {
						// Draw from middle sorted array up & down to approximate drawing from center of view out.
						var arrayMidpoint = Math.floor(cacheArrayInView.length / 2);
						for (var i = arrayMidpoint, j = cacheArrayInView.length; i < j; i++) {
							displayTile(display, tier, cacheArrayInView[i]);
							if (cacheArrayInView.length-i-1 != i) {
								displayTile(display, tier, cacheArrayInView[cacheArrayInView.length-i-1]);
							}
						}

					} else {
						// Draw simple, first to last.
						for (var i = 0, j = cacheArrayInView.length; i < j; i++) {
							displayTile(display, tier, cacheArrayInView[i]);
						}
					}

				} else {
					traceDebugValues('No cached tiles in view');
				}

				traceDebugValues('blankLine');
			}
		}

		function displayCacheDisplay (tier, cacheArray) {
			// In canvas browsers avoid blink of visible backfill as canvas is fully cleared
			// and redrawn by first drawing cached tiles from prior view to temp canvas.

			// Calculate tiles at edges of viewport display for current view.
			var bBox = getViewportDisplayBoundingBoxInTiles();

			// Synchronize transition canvas to collect cached tiles.
			syncTransitionCanvas();

			for (var i = 0, j = cacheArray.length; i < j; i++) {
				var tile = cacheArray[i];
				if (tile && tile.t == tier && (tier == tierBackfill || (tile.c >= bBox.l && tile.c <= bBox.r && tile.r >= bBox.t && tile.r <= bBox.b))) {
					displayTile(tC, tier, tile);
				}
			}
		}

		syncTransitionCanvas = function () {
			if (tC && tS && tCtx) {
				tC.width = vD.width;
				tC.height = vD.height;
				tS.width = vS.width;
				tS.height = vS.height;
				tS.left = vS.left;
				tS.top = vS.top;
				tCtx.restore();
				tCtx.save();
				tCtx.translate(displayCtrX, displayCtrY);
				tCtx.scale(tierScale, tierScale);
			}
		}
		
		

		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::: TILE LOADING FUNCTIONS ::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		function loadNewTiles (tileNamesArray, loadHandler, drawMethod, requester) {
					
			// For Zoomify Image Files (ZIF or PFF) loading is contingent on offset chunk having loaded.
			var reqValue = (typeof requester !== 'undefined' && requester !== null) ? '-' + requester : '';

			if (tileNamesArray.length > 0 ) {
				traceDebugValues('loadNewTiles' + reqValue, null, null, tileNamesArray);

				var loadStart = new Date().getTime();

				if (drawMethod == 'centerOut' && tileNamesArray.length > 4) {
					// Draw from middle of view out by temporarily recentering coordinates over 0,0, then sorting by the
					// geometric distance from the new origin. Limitations: does not yet allow for non-square display areas.
					var tempTiles = [];
					var tL = 0, tR = 0, tT = 0, tB = 0;
					for (var i = 0; i < tileNamesArray.length; i++) {
						var tileName = tileNamesArray[i];
						if (tileName) {
							var tile = new Tile(tileName, requester);
							tempTiles[tempTiles.length] = tile;
							if (i == 0) {
								tL = tR = tile.c;
								tT = tB = tile.r;
							} else {
								if (tile.c < tL) {
									tL = tile.c;
								} else if (tile.c > tR) {
									tR = tile.c;
								}
								if (tile.r < tT) {
									tT = tile.r;
								} else if (tile.r > tB) {
									tB = tile.r;
								}
							}
						}
					}
					var width = tR - tL, height = tB - tT;
					var adjustX = tL + (width / 2);
					var adjustY = tT + (height / 2);
					for (var i = 0; i < tempTiles.length; i++) {
						tempTiles[i].r -= adjustY;
						tempTiles[i].c -= adjustX;
					}
					tempTiles.sort( function (a, b) {
						var distanceA = (a.r * a.r + a.c * a.c); // Math.sqrt(a.r * a.r + a.c * a.c); // Alternative implementation: sqrt not required.
						var distanceB = (b.r * b.r + b.c * b.c); // Math.sqrt(b.r * b.r + b.c * b.c); // Alternative implementation: sqrt not required.
						var distanceDiff = distanceA - distanceB;
						return distanceDiff;
					});
					for (var i = 0; i < tempTiles.length; i++) {
						tempTiles[i].r += adjustY;
						tempTiles[i].c += adjustX;
						loadTile(tempTiles[i], loadStart, loadHandler);
						// Debug option: console.log(tempTiles[i].name);
					}

				} else {
					// Draw simple, first to last.
					for (var i = 0, j = tileNamesArray.length; i < j; i++) {
						var tileName = tileNamesArray[i];
						if (tileName) {
							var tile = new Tile(tileName, requester);
							loadTile(tile, loadStart, loadHandler);
						}
					}
				}

				traceDebugValues('blankLine');
			} else {
				traceDebugValues('loadNewTiles' + reqValue, 'No new tiles requested');
			}
		}

		function Tile (name, requester) {			
			// Enable invalidation of tile requests fulfilled after current image change.
			this.imagePath = thisViewer.imagePath;

			// Values used by drawTileOnCanvas and drawTileInHTML.
			this.name = name;
			var tileVals = new TileCoords(name);
			this.t = tileVals.t;
			this.c = tileVals.c;
			this.r = tileVals.r;
			this.x = Math.floor(this.c * TILE_WIDTH);
			this.y = Math.floor(this.r * TILE_HEIGHT);
			this.image = null;
			this.alpha = 0;

			this.url = thisViewport.formatTilePath(this.t, this.c, this.r, requester);
			this.loadTime = null;

			// Values used only by drawTileInHTML.
			this.elmt = null;
			this.style = null;
		}

		function TileCoords (name) {
			this.t = parseInt(name.substring(0, name.indexOf('-')), 10);
			this.c = parseInt(name.substring(name.indexOf('-') + 1, name.lastIndexOf('-')), 10);
			this.r = parseInt(name.substring(name.lastIndexOf('-') + 1), 10);
		}

		this.formatTilePath = function (t, c, r, requester) {			
			var tilePath;
			if (thisViewer.tileSource == 'ZoomifyZIFFile') {
				tilePath = formatTilePathZIF(t, c, r, requester);
			} else if (thisViewer.tileSource == 'ZoomifyImageFolder') {
				tilePath = formatTilePathImageFolder(t, c, r, requester);
			} else if (thisViewer.tileSource == 'ZoomifyPFFFile' && thisViewer.tileHandlerPathFull === null) {
				tilePath = formatTilePathPFF(t, c, r, requester);
			} else if (thisViewer.tileSource == 'ZoomifyPFFFile') {
				tilePath = formatTilePathPFFServlet(t, c, r, requester);
			} else if (thisViewer.tileSource == 'DZIFolder') {
				tilePath = formatTilePathDZI(t, c, r, requester);
			} else if (thisViewer.tileSource == 'IIIFImageServer') {
				tilePath = formatTilePathIIIFImageServer(t, c, r, requester);
			} else if (thisViewer.tileSource == 'ImageServer') {
				// Example image server protocol implementation.
				tilePath = formatTilePathImageServer(t, c, r, requester);
			}
			return tilePath;
		}

		// Tile path is actually image file path plus start and end byte positions in the ZIF file. This is used by
		// function loadImageByteRange to request tile image bytes.  Tile path is set to 'offsetLoading' if new
		// offset chunk must be loaded from ZIF to determine the start and end positions.
		function formatTilePathZIF (t, c, r, requester) {			
			// Set default values to control asynchronous tile, offset, and byte count loading.
			var vpID = thisViewport.getViewportID();
			var tilePath = 'offsetLoading', tileOffset = 'loading', tileByteCount = 'loading';
			var index, chunkData;

			// Load offset to tile offsets if many or actual tile offset if just one.
			if (tierTileOffsetsCount[t] == 1) {
				tileOffset = tierTileOffsetsStart[t];

			} else {
				// Determine chunkID, chunkStart, chunkEnd, and offsetStartInChunk.
				var offsetValues = new OffsetChunkValues(t, c, r);

				// Determine if tile offset must be loaded or already has previously. If must download, minimize round-trips by downloading many at once.
				// Offset values are 64-bit values (eight bytes each). Add 12 only during IFD parsing (for the offset from the start of the IFD entry).
				var offsetTileRetry = offsetValues.chunkID + ',' + t +',' + c +',' + r + ',' + requester + ',' + 'offset';
				index = Z.Utils.arrayIndexOfObjectValue(tierTileOffsetChunks, 'chunkID', offsetValues.chunkID);
				if (index == -1) {

					traceDebugValues('formatTilePathZIF', offsetValues.chunkID + ',' + t +',' + c +',' + r + ',' + requester);

					if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, offsetTileRetry) == -1) {
						tilesRetryNamesChunks[tilesRetryNamesChunks.length] = offsetTileRetry;
					}
					tierTileOffsetChunks[tierTileOffsetChunks.length] = { chunkID:offsetValues.chunkID, chunk:'loading' };
					var netConnector = new Z.NetConnector(thisViewer);
					netConnector.loadByteRange(imagePath, offsetValues.chunkStart, offsetValues.chunkEnd, 'offset', null, offsetValues.chunkID, vpID);

				} else if (tierTileOffsetChunks[index].chunk == 'loading') {
					if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, offsetTileRetry) == -1) {
						tilesRetryNamesChunks[tilesRetryNamesChunks.length] = offsetTileRetry;
					}

				} else if (tierTileOffsetChunks[index].chunk != 'loading') {
					chunkData = tierTileOffsetChunks[index].chunk;
					tileOffset = Z.Utils.longValue(chunkData, offsetValues.offsetStartInChunk);
				}
			}

			// Load bytecount offsets if many, actual byte count if one, or concatenated & delimited byte counts if two.
			var bcChunkNumInTier, bcTileRetry;
			if (tierTileByteCountsCount[t] == 1) {
				tileByteCount = tierTileByteCountsStart[t];

			} else {
				var bcNumInTier = c + r * tierWInTiles[t];

				if (tierTileByteCountsCount[t] == 2) {
					var bcConcat = tierTileByteCountsStart[t];
					if (bcNumInTier == 0) {
						tileByteCount = bcConcat.substring(0, bcConcat.indexOf(','));
					} else {
						tileByteCount = bcConcat.substring(bcConcat.indexOf(',') + 1, bcConcat.length);
					}

				} else {
					// Determine chunkID, chunkStart, chunkEnd, and byteCountStartInChunk.
					var byteCountValues = new ByteCountChunkValues(t, c, r);

					// Determine if tile byte count must be loaded or already has previously. If must download, minimize round-trips by downloading many at once.
					// Byte counts are 32-bit values (four bytes each). Use Z.Utils.intValue for the byte counts (which only decodes four bytes).  Add 12 only during IFD parsing (for the offset from the start of the IFD entry).
					var bcTileRetry = byteCountValues.chunkID + ',' + t +',' + c +',' + r + ',' + requester + ',' + 'byteCount';
					index = Z.Utils.arrayIndexOfObjectValue(tierTileByteCountChunks, 'chunkID', byteCountValues.chunkID);
					if (index == -1) {
						if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, bcTileRetry) == -1) {
							tilesRetryNamesChunks[tilesRetryNamesChunks.length] = bcTileRetry;
						}
						tierTileByteCountChunks[tierTileByteCountChunks.length] = { chunkID:byteCountValues.chunkID, chunk:'loading' };
						var netConnector = new Z.NetConnector(thisViewer);
						netConnector.loadByteRange(imagePath, byteCountValues.chunkStart, byteCountValues.chunkEnd, 'byteCount', null, byteCountValues.chunkID, vpID);

					} else if (tierTileByteCountChunks[index].chunk == 'loading') {
						if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, bcTileRetry) == -1) {
							tilesRetryNamesChunks[tilesRetryNamesChunks.length] = bcTileRetry;
						}

					} else if (tierTileByteCountChunks[index].chunk != 'loading') {
						chunkData = tierTileByteCountChunks[index].chunk;
						tileByteCount = Z.Utils.intValue(chunkData, byteCountValues.bcStartInChunk);
					}
				}
			}

			// Return tile path for loadNewTiles or loadNewTilesRetry to download tiles.
			if (tileOffset != 'loading' && !isNaN(tileOffset) && tileByteCount != 'loading' && !isNaN(tileByteCount) ) {
				tilePath = imagePath + '?' + tileOffset.toString() + ','+ tileByteCount.toString();

				// Alternative implementation: Cache-proofing of tile paths for ZIF requests is not required for current uses.
				//tilePath = Z.Utils.cacheProofPath(tilePath);
			}

			return tilePath;
		}

		// Determine offset chunk needed, its size, start, and end, and limit size to number of offsets in tier of tile in request.
		function OffsetChunkValues (t, c, r) {
			var offsetNumInTier = c + r * tierWInTiles[t];
			var offsetStartInTier = offsetNumInTier * 8 + tierTileOffsetsStart[t];
			var offsetChunkNumInTier = Math.floor(offsetNumInTier / CHUNK_SIZE);
			var chunkEndTest = offsetChunkNumInTier * CHUNK_SIZE;
			var chunkPastEndTest = chunkEndTest + CHUNK_SIZE;
			var currentChunkSize = (chunkPastEndTest > tierTileCounts[t]) ? (tierTileCounts[t] - chunkEndTest) * 8 : OFFSET_CHUNK_SIZE_BYTES;

			this.chunkStart = tierTileOffsetsStart[t] + (offsetChunkNumInTier * OFFSET_CHUNK_SIZE_BYTES);
			this.chunkEnd = this.chunkStart + currentChunkSize;
			this.offsetStartInChunk = offsetStartInTier - this.chunkStart;
			this.chunkID = t.toString() + '-' + offsetChunkNumInTier.toString();
		}

		// Determine byteCount chunk needed, its size, start, and end, and limit size to number of byteCounts in tier of tile in request.
		function ByteCountChunkValues (t, c, r) {
			var bcNumInTier = c + r * tierWInTiles[t];
			var bcStartInTier = bcNumInTier * 4 + tierTileByteCountsStart[t];
			var bcChunkNumInTier = Math.floor(bcNumInTier / CHUNK_SIZE);
			var chunkEndTest = bcChunkNumInTier * CHUNK_SIZE;
			var chunkPastEndTest = chunkEndTest + CHUNK_SIZE;
			var currentChunkSize = (chunkPastEndTest > tierTileCounts[t]) ? (tierTileCounts[t] - chunkEndTest) * 4 : BC_CHUNK_SIZE_BYTES;

			this.chunkStart = tierTileByteCountsStart[t] + (bcChunkNumInTier * BC_CHUNK_SIZE_BYTES);
			this.chunkEnd = this.chunkStart + currentChunkSize;
			this.bcStartInChunk = (bcStartInTier - this.chunkStart);
			this.chunkID = t.toString() + '-' + bcChunkNumInTier.toString();
		}

		function formatTilePathImageFolder (t, c, r, requester) {
			// URI for each tile includes image folder path, tile group subfolder name, and tile filename.
			var offset = r * tierWInTiles[t] + c;
			for (var i = 0; i < t; i++) { offset += tierTileCounts[i]; }
			var tileGroupNum = Math.floor(offset / TILES_PER_FOLDER);
			var tilePath = imagePath + '/' + 'TileGroup' + tileGroupNum + '/' + t + '-' + c + '-' + r + '.' + thisViewer.tileType;

			// DEV NOTE: Must cache-proof tile paths for old IE versions and if tile caching set off by resource change.
			// Implementing for all cases as precaution and monitoring for issue reports.  Implementing in function
			// formatTilePath rather than in call to it because excluding PFF (image file) and third party protocol
			// tile requests to avoid complications with server-side helper app or image server tile fulfillment.
			if ((Z.browser == Z.browsers.IE && Z.browserVersion < 9)|| TILES_CACHE_MAX == 0) {
				tilePath = Z.Utils.cacheProofPath(tilePath);
			}

			return tilePath;
		}

		this.formatTilePathDZI = function (t, c, r, requester) {
			return formatTilePathDZI(t, c, r, requester);
		}

		// DZI tile paths resemble Zoomify Image folders but have a subfolder per tier.
		function formatTilePathDZI (t, c, r, requester) {
			var tilePath = formatFilePathDZI('tile', t, c, r, requester);
			return tilePath;
		}

		this.formatFilePathDZI = function (reqType, t, c, r, requester) {
			return formatFilePathDZI(reqType, t, c, r, requester);
		}

		// Request types supported: 'properties', 'tile'.			
		function formatFilePathDZI (reqType, t, c, r, requester) {
			var returnPath;
			if (reqType == 'tile') {
				var subfolderOfTier = (parseInt(t, 10) + thisViewer.dziSubfoldersToSkip + 1).toString();
				returnPath = thisViewer.imagePath + '/' + thisViewer.dziImageSubfolder + '/' + subfolderOfTier + '/' + c + '_' + r + '.' + thisViewer.tileType;
			} else {
				returnPath = thisViewer.imagePath + '/' + thisViewer.dziImagePropertiesFilename;
			}

			// See cache proofing notes in function formatTilePathImageFolder above. 
			if ((Z.browser == Z.browsers.IE && Z.browserVersion < 9)|| TILES_CACHE_MAX == 0) {
				returnPath = Z.Utils.cacheProofPath(returnPath);
			}

			return returnPath;
		}	

		// Tile path is actually image file path plus start and end byte positions in the PFF file. This is used by
		// function loadImageByteRange to request tile image bytes.  Tile path is set to 'offsetLoading' if new
		// offset chunk must be loaded from PFF to determine the start and end positions.
		function formatTilePathPFF (t, c, r, requester) {
			// Set default values to control asynchronous tile, offset, and byte count loading.
			var vpID = thisViewport.getViewportID();
			var tilePath = 'offsetLoading', tileOffset = 'loading', tileByteCount = 'loading';
			var chunkIndex;

			// Determine chunkID, chunkStart, chunkEnd, offsetIndexInChunk, and bcIndexInChunk.
			var currentOffsetIndex = 0;
			for (var tierCntr = tierCount - 1; tierCntr > t; tierCntr--) { currentOffsetIndex += tierTileCounts[tierCntr]; }
			currentOffsetIndex += r * tierWInTiles[t] + c;
			var chunkID = Math.floor(currentOffsetIndex / CHUNK_SIZE);	
			var chunkStart = HEADER_SIZE_TOTAL + CHUNK_SIZE * chunkID * 8;
			var chunkEnd = chunkStart + CHUNK_SIZE * 8;		
			var offsetIndexInChunk = currentOffsetIndex - chunkID * CHUNK_SIZE;
			var bcIndexInChunk = offsetIndexInChunk * 8;

			// Determine if tile offset must be loaded or already has previously. If must download, minimize round-trips by downloading many at once.
			var chunkRetry = chunkID + ',' + t +',' + c +',' + r + ',' + requester + ',' + 'chunk';
			chunkIndex = Z.Utils.arrayIndexOfObjectValue(offsetChunks, 'chunkID', chunkID);
			
			if (chunkIndex == -1) {
				traceDebugValues('formatTilePathPFF', chunkID + ',' + t +',' + c +',' + r + ',' + requester);
				if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, chunkRetry) == -1) {
					tilesRetryNamesChunks[tilesRetryNamesChunks.length] = chunkRetry;
				}
				offsetChunks[offsetChunks.length] = { chunkID:chunkID, chunk:'loading' };
				var netConnector = new Z.NetConnector(thisViewer);
				netConnector.loadByteRange(imagePath, chunkStart, chunkEnd, 'offset', null, chunkID, vpID);

			} else if (offsetChunks[chunkIndex].chunk == 'loading') {
				if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, chunkRetry) == -1) {
					tilesRetryNamesChunks[tilesRetryNamesChunks.length] = chunkRetry;
				}

			} else {
				tileOffset = Z.Utils.longValue(offsetChunks[chunkIndex].chunk, (offsetIndexInChunk-1) * 8, true);
				tileByteCount = Z.Utils.longValue(offsetChunks[chunkIndex].chunk, bcIndexInChunk, true) - tileOffset - 1;
				
				// Return tile path for loadNewTiles or loadNewTilesRetry to download tiles.
				if (tileOffset != 'loading' && !isNaN(tileOffset) && tileByteCount != 'loading' && !isNaN(tileByteCount) ) {
					tilePath = imagePath + '?' + tileOffset.toString() + ','+ tileByteCount.toString();

					// Alternative implementation: Cache-proofing of tile paths for PFF requests is not required for current uses.
					//tilePath = Z.Utils.cacheProofPath(tilePath);
				}
			}

			return tilePath;
		}

		// Tile path is actually tile request to servlet or other server-side helper application.
		// Tile request is set to 'offsetLoading' if new header offset chunk must be loaded from PFF.
		// Tile request otherwise includes image file path, request type, begin byte, end byte, image version, and header size.
		// Request types include: 1 = image file header, 2 = header offset chunk, 0 = image tile.
		function formatTilePathPFFServlet (t, c, r, requester) {
			// Tile path is actually tile request to servlet or other server-side helper application.
			// Tile request is set to 'offsetLoading' if new header offset chunk must be loaded from PFF.
			// Tile request otherwise includes image file path, request type, begin byte, end byte, image version, and header size.
			// Request types include: 1 = image file header, 2 = header offset chunk, 0 = image tile.

			var tilePath = 'offsetLoading';

			var currentOffsetIndex = 0;
			var currentOffsetIndexBegin = 0;
			var currentOffsetChunk;
			var currentOffsetChunkBegin;
			var offsetChunkIndex;
			var offsetChunkIndexBegin;
			var offsetChunkBeginByte;
			var offsetChunkEndByte;
			var offsetChunkBeginBeginByte;
			var offsetChunkBeginEndByte;

			for (var tierCntr = tierCount - 1; tierCntr > t; tierCntr--) {
				currentOffsetIndex += tierTileCounts[tierCntr];
			}

			currentOffsetIndex += r * tierWInTiles[t] + c;
			currentOffsetChunk = Math.floor(currentOffsetIndex / CHUNK_SIZE);
			currentOffsetIndexBegin = (currentOffsetIndex - 1 == -1) ? 0 : currentOffsetIndex - 1;
			currentOffsetChunkBegin = Math.floor(currentOffsetIndexBegin / CHUNK_SIZE);

			if (typeof offsetChunks[currentOffsetChunk] === 'undefined' || offsetChunks[currentOffsetChunk] == 'offsetLoading' || typeof offsetChunks[currentOffsetChunkBegin] === 'undefined' || offsetChunks[currentOffsetChunkBegin] == 'offsetLoading') {
				var tileRetryString = currentOffsetChunk + ',' + t +',' + c +',' + r + ',' + requester + ',' + 'chunk';
				if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, tileRetryString) == -1) { tilesRetryNamesChunks[tilesRetryNamesChunks.length] = tileRetryString; }

				traceDebugValues('formatTilePathPFF', currentOffsetChunk + ',' + t +',' + c +',' + r + ',' + requester);

				// No redundant offset loads if call already in progress (element would be 'offsetLoading', not undefined).
				if (typeof offsetChunks[currentOffsetChunk] === 'undefined') {
					offsetChunks[currentOffsetChunk] = 'offsetLoading';
					offsetChunkBeginByte = HEADER_SIZE_TOTAL + CHUNK_SIZE * currentOffsetChunk * 8;
					offsetChunkEndByte = offsetChunkBeginByte + CHUNK_SIZE * 8;
					loadOffsetChunk(offsetChunkBeginByte, offsetChunkEndByte, currentOffsetChunk);
				}
				// No redundant offset loads if this chunk would be same as above (element would be 'offsetLoading', not undefined).
				if (typeof offsetChunks[currentOffsetChunkBegin] === 'undefined') {
					offsetChunks[currentOffsetChunkBegin] = 'offsetLoading';
					offsetChunkBeginBeginByte = HEADER_SIZE_TOTAL + CHUNK_SIZE * currentOffsetChunkBegin * 8;
					offsetChunkBeginEndByte = offsetChunkBeginBeginByte + CHUNK_SIZE * 8;
					loadOffsetChunk(offsetChunkBeginBeginByte, offsetChunkBeginEndByte, currentOffsetChunk);
				}

			} else {
				var absoluteBeginning = Math.floor(offsetChunks[currentOffsetChunk][0]);
				var absoluteBeginningBegin = Math.floor(offsetChunks[currentOffsetChunkBegin][0]);
				var offsetString = offsetChunks[currentOffsetChunkBegin][1];
				var offsetString2 = offsetChunks[currentOffsetChunk][1];
				offsetChunkIndexBegin = 9 * (currentOffsetIndexBegin % CHUNK_SIZE);
				var tempInt = Math.floor(parseFloat(offsetString.substring(offsetChunkIndexBegin, offsetChunkIndexBegin + 9)));
				offsetChunkIndex = 9 * (currentOffsetIndex % CHUNK_SIZE);
				var tempInt2 = Math.floor(parseFloat(offsetString2.substring(offsetChunkIndex, offsetChunkIndex + 9)));
				var sByte = (currentOffsetIndex == 0) ? HEADER_SIZE_TOTAL + TILE_COUNT * 8 : absoluteBeginningBegin + tempInt;
				var eByte = absoluteBeginning + tempInt2;

				if ((eByte - sByte) > 0) {
					tilePath = thisViewer.tileHandlerPathFull + "?file=" + imagePath + "&requestType=0&begin=" + sByte.toString() + "&end=" + eByte.toString() + "&vers=" + IMAGE_VERSION.toString() + "&head=" + HEADER_SIZE.toString();
				} else {
					tilePath = 'skipTile:' + t + '-' + c + '-' + r;
				}
			}

			return tilePath;
		}

		function loadOffsetChunk (offsetStartByte, offsetEndByte, chunkID) {
			var vpID = thisViewport.getViewportID();
			offsetChunkBegins[offsetStartByte] = chunkID;
			var netConnector = new Z.NetConnector(thisViewer);

			if (thisViewer.tileHandlerPathFull === null) {
				// PFF viewing without servlet.
				netConnector.loadByteRange(thisViewer.imagePath, offsetStartByte, offsetEndByte, 'offset', null, chunkID, vpID);

			} else {		
				// Build data request with query string and send.
				var REQUEST_TYPE = 2; // 1 = header, 2 = offset, 0 = tile.
				var imgPathNoDot = imagePath.replace('.', '%2E');  // Required for servlet.
				var offsetChunkPath = thisViewer.tileHandlerPathFull + '?file=' + imgPathNoDot + '&requestType=' + REQUEST_TYPE + '&begin=' + offsetStartByte + '&end=' + offsetEndByte;
				netConnector.loadXML(offsetChunkPath);
			}
		}

		this.parsePFFOffsetChunk = function (data, chunkID) {
			var index = Z.Utils.arrayIndexOfObjectValue(offsetChunks, 'chunkID', chunkID);
			if (index != -1) {
				offsetChunks[index].chunk = data;
				selectTilesRetry(chunkID, 'chunk');
			}
		}

		this.parsePFFOffsetChunkServlet = function (xmlDoc) {
			var begin = parseInt(xmlDoc.documentElement.getAttribute('BEGIN'), 10);
			var replyData = xmlDoc.documentElement.getAttribute('REPLYDATA');
			var chunkNumber = offsetChunkBegins[begin];
			var offsetOfCurrentChunkBegin = Math.floor(((begin - HEADER_SIZE_TOTAL) / 8) / CHUNK_SIZE);
			offsetChunks[offsetOfCurrentChunkBegin] = new Array();
			offsetChunks[offsetOfCurrentChunkBegin] = replyData.split(',', 2);

			selectTilesRetry(chunkNumber, 'chunk');

			// Debug options:
			//trace('parseOffsetChunk-begin + replyData + chunk: ' + begin + '  ' + replyData + '  ' + chunk);
			//trace('parseOffsetChunk-offsetChunks[offsetOfCurrentChunkBegin][0] & [1]: ' + offsetChunks[offsetOfCurrentChunkBegin][0] + ', ' + offsetChunks[offsetOfCurrentChunkBegin][1]);
		}

		function selectTilesRetry (chunkID, type) {			
			for(var i = 0, j = tilesRetryNamesChunks.length; i < j; i++) {
				var tilesRetryElements = tilesRetryNamesChunks[i].split(',');
				if (tilesRetryElements[0] == chunkID && tilesRetryElements[5] == type) {
					if (typeof tilesRetryElements[4] !== 'undefined' && tilesRetryElements[4] == 'image-display') {
						tilesRetryNames[tilesRetryNames.length] = tilesRetryElements[1] + '-' + tilesRetryElements[2] + '-' + tilesRetryElements[3]; // t,c,r
					} else if (tilesRetryElements[4] == 'image-backfill') {
						tilesBackfillRetryNames[tilesBackfillRetryNames.length] = tilesRetryElements[1] + '-' + tilesRetryElements[2] + '-' + tilesRetryElements[3]; // t,c,r
					}
					tilesRetryNamesChunks = Z.Utils.arraySplice(tilesRetryNamesChunks, i, 1);
					i--;
					j--;
				}
			}

			if (tilesRetryNames.length > 0) {
				tilesRetryNames.sort();
				tilesRetryNames = Z.Utils.arrayUnique(tilesRetryNames);
				traceDebugValues('selectTilesRetry', tilesRetryNames);
				var loadHandler = (getStatus('imageSaving')) ? onTileLoadToSave : onTileLoad;
				loadNewTilesRetry(tilesRetryNames, loadHandler, 'simple', 'image-display');
			}

			if (tilesBackfillRetryNames.length > 0) {
				tilesBackfillRetryNames.sort();
				tilesBackfillRetryNames = Z.Utils.arrayUnique(tilesBackfillRetryNames);
				var loadHandler = (getStatus('imageSaving')) ? onTileBackfillLoadToSave : onTileBackfillLoad;
				loadNewTilesRetry(tilesBackfillRetryNames, loadHandler, 'simple', 'image-backfill');
			}
		}

		function loadNewTilesRetry (tileNamesArray, loadHandler, drawMethod, requester) {
			var loadStart = new Date().getTime();

			for (var i = 0, j = tileNamesArray.length; i < j; i++) {
				var tile = null;
				var tileName = tileNamesArray[i];
				if (tileName) {			
					tileNamesArray = Z.Utils.arraySplice(tileNamesArray, i, 1);
					i--;
					j--;
					index = Z.Utils.arrayIndexOfObjectValue(tilesRetry, 'name', tileName);
					if (index != -1) {
						tile = tilesRetry[index];
						tilesRetry = Z.Utils.arraySplice(tilesRetry, index, 1);
						tile.url = thisViewport.formatTilePath(tile.t, tile.c, tile.r, requester);
					} else {
						tile = new Tile(tileName, requester);
					}

					if (tile != null && tile.url.indexOf('NaN') == -1) {
						traceDebugValues('loadNewTilesRetry', tile.name + '  ' + tile.url);
						loadTile(tile, loadStart, loadHandler);

					} else if (tile.url.indexOf('NaN') == -1) {
						thisViewer.showMessage(Z.Utils.getResource('ERROR_TILEPATHINVALID-ZIF') + tile.name + '.jpg', false, thisViewer.messageDurationShort, 'center', false);
					}
				}
			}
		}

		function skipTile (tile) {
			// Tiles to skip are tiles not captured at a particular position in an image at a particular resolution.  This
			// results from microscopy scanning to create a Zoomify Image File (ZIF) or Zoomify Pyramidal File (PFF)
			// where only areas of primary interest are scanned at high resolution while in other areas the lower resolution
			// backfill image tiles are allowed to show through. For these tiles, the PFF offset chunks will have a byte range
			// for the tile that is 0 bytes in length. This approach results in more efficient storage and bandwidth use.
			// Skipped tiles are not loaded but are added to tile cache to prevent redundant future loading attempts.

			// Debug option: Use next line to trace tiles not requested due to sparse PFF tile feature.
			// console.log('Tile skipped: ' + tile.name);

			cacheTile(tile);

			var tileName = tile.name;
			var index = Z.Utils.arrayIndexOf(tilesLoadingNames, tileName);
			if (index != -1) { tilesLoadingNames = Z.Utils.arraySplice(tilesLoadingNames, index, 1); }
			if (thisViewer.tileSource == 'ZoomifyZIFFile' || thisViewer.tileSource == 'ZoomifyPFFFile') {
				var index2 = Z.Utils.arrayIndexOf(tilesRetryNames, tileName);
				if (index2 != -1) { tilesRetryNames = Z.Utils.arraySplice(tilesRetryNames, index2, 1); }
			}
			tilesInView[tilesInView.length] = tile;
			tilesInViewNames[tilesInViewNames.length] = tileName;
		}

		function loadTile (tile, loadTime, loadHandler) {					
			// Asynchronously load tile and ensure handler function is called upon loading.
			var tileName = tile.name;
			if (tile.url.substr(0, 8) == 'skipTile') {
				skipTile(tile);

			} else if (tile.url == 'offsetLoading') {
				var index = Z.Utils.arrayIndexOfObjectValue(tilesRetry, 'name', tileName);
				if (index == -1) { tilesRetry[tilesRetry.length] = tile; }
				traceDebugValues('loadTileDelayForOffset', tileName);

			} else if (tile.url != 'offsetLoading') {
				var tileType;
				if (loadHandler == onTileLoad || (Z.enterpriseParamsEnabled && loadHandler == onTileLoadToSave)) {
					tileType = 'image-display';
				} else if (loadHandler == onTileBackfillLoad || loadHandler == onTileBackfillLoadToSave) {
					tileType = 'image-backfill';
				}

				// Load tile unless it is for frontfill but already loaded for backfill.
				var tilesCachedForBackfill = ((tile.t == backfillChoice0 && backfillTresholdCached0) || (tile.t == backfillChoice1 && backfillTresholdCached1) || (tile.t == backfillChoice2 && backfillTresholdCached2));
				if (!(tileType == 'image-display' && tilesCachedForBackfill)) {
					tile.loadTime = loadTime;
					traceDebugValues('loadTile-' + tileType, tileName);				
					var vpID = thisViewport.getViewportID();			
					tileNetConnector.loadImage(tile.url, Z.Utils.createCallback(null, loadHandler, tile), tileType, tile, vpID);

					// DEV NOTE: This value returned by function for possible future storage and use (currently used when loading hotspot media).
					//tile.loading = tileNetConnector.loadImage(tile.url, Z.Utils.createCallback(null, loadHandler, tile), tileType, tile, vpID);
				}
			}
		}

		function onTileLoad (tile, image) {		
			if (tile && image && tile.imagePath == thisViewer.imagePath) {  // Verify tile and image are not null and current image hasn't changed during request fulfillment.
				tile.image = image;
				var tileName = tile.name;

				// Verify loading tile is still in loading list and thus still required.  Allows for loading delays due to network latency or PFF header chunk loading.
				var index = Z.Utils.arrayIndexOf(tilesLoadingNames, tileName);
				if (index != -1) {

					tilesLoadingNames = Z.Utils.arraySplice(tilesLoadingNames, index, 1);
					cacheTile(tile);

					// Stop here if preloading tiles from non-current tiers so tile is cached but not drawn.
					if (thisViewer.preloadVisible && !thisViewer.imageSet && tile.t != tierCurrent) {
						var msgTxt = (!thisViewer.imageSet) ? Z.Utils.getResource('ALERT_PRELOADING-STORINGORDRAWINGTILESIMAGE') : (thisViewer.animation) ? Z.Utils.getResource('ALERT_PRELOADING-STORINGORDRAWINGTILESANIMATION') : Z.Utils.getResource('ALERT_PRELOADING-STORINGORDRAWINGTILESSLIDES') ;
						thisViewer.showMessage(msgTxt + '   Tile: ' + tileName, false, thisViewer.messageDurationShort / 10, 'center');
						tile.alpha = 1;
						return;
					}

					// Also create current view tile collection for faster zoomAndPanToView function.
					if (Z.Utils.arrayIndexOf(tilesInViewNames, tileName) == -1) {
						tilesInViewNames[tilesInViewNames.length] = tileName;
						tilesInView[tilesInView.length] = tile;
					}

					// If preloading other Viewports for image set show message.
					if (thisViewer.preloadVisible && thisViewer.imageSet && thisViewport.getViewportID() != thisViewer.viewportCurrentID) {
						var statusCounterStr = (thisViewport.getViewportID() + 1).toString() + ' of ' + thisViewer.imageSetLength.toString()
						var viewportAndTile = statusCounterStr + '   Tile: ' + tileName;
						var msgTxt = (!thisViewer.imageSet) ? Z.Utils.getResource('ALERT_PRELOADING-STORINGORDRAWINGTILESIMAGE') : (thisViewer.animation) ? Z.Utils.getResource('ALERT_PRELOADING-STORINGORDRAWINGTILESANIMATION') : Z.Utils.getResource('ALERT_PRELOADING-STORINGORDRAWINGTILESSLIDES') ;
						thisViewer.showMessage(msgTxt + viewportAndTile, false, thisViewer.messageDurationShort / 10, 'center');
					}

					// Draw tile with fade-in.
					if (!fadeInInterval) { fadeInInterval = window.setInterval(fadeInIntervalHandler, 50); }

					// Determine if all new tiles have loaded.
					tilesLoadingNamesLength = tilesLoadingNames.length;
					if (tilesLoadingNamesLength == 0) {

						// Fully clear and redraw viewport display if canvas in use. If using canvas browser,
						// display temporary transition canvas while display canvas is updated.
						if (thisViewer.useCanvas && (TILES_CACHE_MAX > 0)) {
							if (!tierChanged) {
								redisplayCachedTiles(vD, tierCurrent, tilesCached, 'centerOut', false, '4. Updating view: all new tiles loaded');
							} else {
								displayCacheDisplay(tierCurrent, tilesCached);
								redisplayCachedTiles(vD, tierCurrent, tilesCached, 'canvasCopy', false, '4. Updating view: all new tiles loaded');
								
								var transitionTimer = window.setTimeout( function () { Z.Utils.clearDisplay(tC, thisViewer); }, 200);
								tierChanged = false;
							}
						}

						// Verify tiles cached in loaded list are under allowed maximum.
						validateCache();

						// Update value for toolbar progress display.
						tilesToLoadTotal = 0;
					}

					// Validate view update progress, and debugging display data.
					traceDebugValues('onTileLoad', tile.name, tile.loadTime);
					thisViewport.updateProgress(tilesToLoadTotal, tilesLoadingNamesLength); // Update loading tracking variable and also progress display if enabled.
				}

				// Validate loading status.
				if (tilesToDisplay == tilesInCache + tilesLoaded) { setStatus('displayLoadedViewport', true); }

			} else if (typeof image === 'undefined' || image === null) {
				if (Z.mobileDevice) {
					console.log(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
				} else {
					console.log(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
				}
			}
		}

		function onTileBackfillLoad (tile, image) {
			if (tile && image && tile.imagePath == thisViewer.imagePath) {  // Verify tile and image are not null and current image hasn't changed during request fulfillment.
				tile.image = image;
				var tileName = tile.name;

				// Cache tile and move tile name from loading list to loaded list.
				tilesBackfillCached[tilesBackfillCached.length] = tile;
				var index = Z.Utils.arrayIndexOf(tilesBackfillCachedNames, tileName);
				if (index != -1) { tilesBackfillCachedNames = Z.Utils.arraySplice(tilesBackfillCachedNames, index, 1); }
				if (thisViewer.tileSource == 'ZoomifyZIFFile' || thisViewer.tileSource == 'ZoomifyPFFFile') {
					var index2 = Z.Utils.arrayIndexOf(tilesBackfillRetryNames, tileName);
					if (index2 != -1) { tilesBackfillRetryNames = Z.Utils.arraySplice(tilesBackfillRetryNames, index2, 1); }
				}

				// Alternative implementation: If preloading show message using same conditions as function onTileLoad except compare tile.t != tierBackfill for non-imageSet case.

				// No backfill fade-in necessary. Tiles precached and load behind main display or outside view area.
				tile.alpha = 1;

				// Draw tile if in current backfill tier, otherwise it will be drawn from cache when needed.
				if (tile.t == tierBackfill ) { displayTile(bD, tierBackfill, tile); }

				// Validate loading status, view update, progress, and debugging display data.
				traceDebugValues('onTileBackfillPrecache', tile.name);
				if (tilesBackfillToPrecache == tilesBackfillToPrecacheLoaded) { setStatus('precacheLoadedViewport', true); }
				traceDebugValues('onTileBackfillLoad', tile.name);
				if (tilesBackfillToDisplay <= tilesBackfillInCache + tilesBackfillLoaded) { setStatus('backfillLoadedViewport', true); }

				// If tile is also present in frontfill pass to handler for caching, tracking, filtering, and display.
				if (tile.t == tierCurrent) { onTileLoad(tile, image); }

			} else if (typeof image === 'undefined' || image === null) {
				if (Z.mobileDevice) {
					console.log(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
				} else {
					thisViewer.showMessage(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
				}
			}
		}

		// DEV NOTE: Not currently applied.
		function onTileLoadWhilePanning (tile, image) {
			if (tile && image) {
				tile.image = image;
				var tileName = tile.name;
				displayTile(vD, tierCurrent, tile);
			} else if (typeof image === 'undefined' || image === null) {
				if (Z.mobileDevice) {
					console.log(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
				} else {
					thisViewer.showMessage(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
				}
			}
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::::: DRAWING FUNCTIONS ::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		function fadeInIntervalHandler () {
			var completeCount = 0;
			for (var i = 0, j = tilesInView.length; i < j; i++) {
				var tile = tilesInView[i];
				if (tile.t == tierCurrent) {

					if (thisViewer.fadeIn && fadeInStep != 0 && (tile.alpha + fadeInStep) < 1) {
						tile.alpha += fadeInStep;
					} else {
						tile.alpha = 1;
						completeCount++;
					}

					// DEV NOTE: Draws tiles in view if any tile new. Allows for loading delays but may draw redundantly on rapid small pans.
					// Debug option: console.log('Fading: ' + tile.name + '  alpha: ' + tile.alpha);
					displayTile(vD, tierCurrent, tile);

					if (completeCount >= j) {
						window.clearInterval(fadeInInterval);
						fadeInInterval = null;
						i = j;
					}
				} else {
					tilesInView = Z.Utils.arraySplice(tilesInView, i, 1);
					tilesInViewNames = Z.Utils.arraySplice(tilesInViewNames, i, 1);
					var index = Z.Utils.arrayIndexOf(tilesLoadingNames, tile.name);
					if (index != -1) { tilesLoadingNames = Z.Utils.arraySplice(tilesLoadingNames, index, 1); }
					j--;
				}
			}
		}

		function displayTile (display, tier, tile) {
			// Draw tile on screen using canvas or image elements as appropriate to browser support.  Apply
			// zoom of current tier to imageX and Y but do not apply scale of current tier as that scaling is function
			// of the context or container object. Do not display tile if tile has been skipped (see skipTile function notes).
			if (tile.url.substr(0, 8) != 'skipTile' && tile.image.width != 0 && tile.image.height != 0) {

				var x = tile.x;
				var y = tile.y;
				var tierCurrentZoomUnscaled = convertTierScaleToZoom(tier, 1);

				tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, getZoom());
				var override = (tierBackfillOversizeScale > 8); // Slider snap or mousewheel can create need for oversize backfill before selectTier resets tierBackfillDynamic = true.
				if (thisViewer.useCanvas) {
					if (display == vD || display == tC || (display == bD && tierBackfillDynamic)) {
						x -= (thisViewer.imageX * tierCurrentZoomUnscaled);
						y -= (thisViewer.imageY * tierCurrentZoomUnscaled);
					} else if (display == oD && (tierBackfillDynamic  || override)) {
						var newVPImgCtrPt = thisViewport.calculateCurrentCenterCoordinates();
						x -= (newVPImgCtrPt.x * tierCurrentZoomUnscaled);
						y -= (newVPImgCtrPt.y * tierCurrentZoomUnscaled);
					}
					drawTileOnCanvas(display, tile, x, y);

				} else {
					var scale;
					if (display == vD) {
						x -= ((thisViewer.imageX * tierCurrentZoomUnscaled) - (displayCtrX / tierScale));
						y -= ((thisViewer.imageY * tierCurrentZoomUnscaled) - (displayCtrY / tierScale));
						scale = tierScale;
					} else {
						scale = tierBackfillScale;
					}
					drawTileInHTML(display, tile, x, y, scale);
				}

				// Validate drawing status, view update, progress, and debugging display data.
				if (display == vD) {
					traceDebugValues('displayTile', tile.name);
					if (tilesToDisplay == tilesDisplayed) { setStatus('displayDrawnViewport', true); }
				} else {
					traceDebugValues('displayBackfillTile', tile.name);
					if (tilesBackfillToDisplay <= tilesBackfillDisplayed) { setStatus('backfillDrawnViewport', true); }
				}
			}
		}

		function drawTileOnCanvas (container, tile, x, y) {
			// Debug option: Uncomment next two lines to display tile borders.
			//x += tile.c;
			//y += tile.r;

			var containerCtx = container.getContext('2d');
			if (Z.alphaSupported && tile.alpha < 1 && container.id != 'transitionCanvas' && (container.id.indexOf('oversizeDisplay') == -1) && container.id != 'savingDisplay' && !imageFilterStatesConvolve) {
				containerCtx.globalAlpha = tile.alpha;
			}

			// If no filter set, draw directly to canvas.  If filter set, apply filter to each tile and use
			// putImageData to place tile image on transfer canvas, then use drawImage to transfer
			// to main canvas and implement scaling (ignored by putImageData function).  If filter
			// set with convolution, reset 'container' to draw all tiles for new view to transfer canvas
			// for image filter display or backfill and function applyImageFilters or onTileLoad will apply
			// filters to full view as one data object to avoid tile lines and then transfer to main canvases.
			if (!thisViewer.imageFilters || imageFiltersApplied.length == 0) {
				containerCtx.drawImage(tile.image, x, y);

			} else {
				if (!imageFilterStatesConvolve) {
					var imgDataObjFiltered = applyImageFiltersTile(tile.name, tile.image);
					Z.Utils.clearDisplay(tC, thisViewer);
					tCtx.putImageData(imgDataObjFiltered, 0, 0);
					containerCtx.drawImage(tC, x, y)

				} else {
					if (container.id.indexOf('oversizeDisplay') != -1) {
						containerCtx = oCtx;
					} else if (container.id.indexOf('viewportDisplay') != -1) {
						containerCtx = fCtx;
					} else if (container.id.indexOf('viewportBackfillDisplay') != -1) {
						containerCtx = fbCtx;
					} else if (container.id.indexOf('transitionCanvas') != -1) {
						// DEV NOTE: Add immediate individual filtering and drawing of cached tiles.
						// Currently this condition blocks temp cache display if convolution filter applied.
						containerCtx = fCtx;
					} else if (container.id == 'savingDisplay') {
						containerCtx = sCtx;
					}
					containerCtx.drawImage(tile.image, x, y);
				}
			}

			if (Z.alphaSupported && tile.alpha < 1 && container.id != 'transitionCanvas' && (container.id.indexOf('oversizeDisplay') == -1) && container.id != 'savingDisplay' && !imageFilterStatesConvolve) {
				containerCtx.globalAlpha = 1;
			}

			// If in debug mode 2, add tile name to tile.
			if (thisViewer.debug == 2 || thisViewer.debug == 4) { drawTileNameOnTile(container, tile.name, x, y, tierScale); }
		}

		function drawTileInHTML (container, tile, x, y, scale) {
			if (!tile.elmt) {
				// Simple conditional above is OK because tile.elmt will not be numeric and thus not 0.
				tile.elmt = Z.Utils.createContainerElement(zvIntID, 'img');
				tile.elmt.onmousedown = Z.Utils.preventDefault; // Disable individual tile mouse-drag.
				Z.Utils.addEventListener(tile.elmt, 'contextmenu', Z.Utils.preventDefault);
				tile.elmt.src = tile.url;
				tile.style = tile.elmt.style;
				tile.style.position = 'absolute';
				Z.Utils.renderQuality (tile, Z.renderQuality);
				if (Z.cssTransformsSupported) { tile.style[Z.cssTransformProperty + 'Origin'] = '0px 0px'; }
			}
			if (tile.elmt.parentNode != container) { container.appendChild(tile.elmt); }
			var tS = tile.style;

			// Speed redraw by hiding tile to avoid drawing on each change (width, height, left, top).
			tS.display = 'none';

			if (Z.cssTransformsSupported) {
				// Backfill in non-IE browsers.
				tS[Z.cssTransformProperty] = ['matrix(', (tile.image.width / tile.elmt.width * scale).toFixed(8), ',0,0,', (tile.image.height / tile.elmt.height * scale).toFixed(8), ',', (x * scale).toFixed(8), Z.cssTransformNoUnits ? ',' : 'px,', (y * scale).toFixed(8), Z.cssTransformNoUnits ? ')' : 'px)'].join('');
			} else {
				// Backfill and frontfill in IE without canvas support.
				tS.width = (tile.image.width * scale) + 'px';
				tS.height = (tile.image.height * scale) + 'px';
				tS.left = (x * scale) + 'px';
				tS.top = (y * scale) + 'px';
			}

			// Unhide tile.
			tS.display = 'inline-block';

			// Set alpha to fade-in tile if supported.
			Z.Utils.setOpacity(tile, tile.alpha);

			// Debug option: Uncomment next two lines to display tile borders.
			//tile.elmt.style.borderStyle = 'solid';
			//tile.elmt.style.borderWidth = '1px';

			// If in debug mode 2, add tile name to tile.
			if (thisViewer.debug == 2 || thisViewer.debug == 4) { drawTileNameOnTile(container, tile.name, x, y, scale); }
		}

		function drawTileNameOnTile (container, tileName, x, y, scale) {
			if (thisViewer.useCanvas) {
				drawTileNameOnCanvas (container, tileName, x, y, scale);
			} else {
				drawTileNameInHTML(container, tileName, x, y, scale);
			}
		}

		function drawTileNameOnCanvas (container, tileName, x, y, scale) {
			// Get font size constraints.
			var defaultFontSize = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONFONTSIZE'), 10);
			var minFontSize = parseInt(Z.Utils.getResource('DEFAULT_MINHOTSPOTCAPTIONFONTSIZE'), 10);
			var maxFontSize = parseInt(Z.Utils.getResource('DEFAULT_MAXHOTSPOTCAPTIONFONTSIZE'), 10);
			var scaledFontSize = Math.round(defaultFontSize * scale);
			var constrainedFontSize = 2 * (( scaledFontSize < minFontSize) ? minFontSize : (( scaledFontSize > maxFontSize) ? maxFontSize : scaledFontSize));

			// Get canvas context and set font style.
			var vpdCtx = container.getContext('2d');
			vpdCtx.font = constrainedFontSize + 'px verdana';
			vpdCtx.textAlign = 'left';
			vpdCtx.textBaseline = 'top';

			// Calculate tile x and y offsets to center on scaled tile.
			var tileNameOffsetW = TILE_WIDTH * scale / 2;
			var tileNameOffsetH = TILE_HEIGHT * scale / 2;

			// Draw tile name white.
			vpdCtx.fillStyle = '#FFFFFF';
			vpdCtx.fillText(tileName, x + tileNameOffsetW, y + tileNameOffsetH);

			// Draw tile name black.
			vpdCtx.fillStyle = '#000000';
			vpdCtx.fillText(tileName, x + tileNameOffsetW + 1, y + tileNameOffsetH + 1);
		}

		function drawTileNameInHTML (container, tileName, x, y, scale) {
			// Get font size constraints.
			var defaultFontSize = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONFONTSIZE'), 10);
			var minFontSize = parseInt(Z.Utils.getResource('DEFAULT_MINHOTSPOTCAPTIONFONTSIZE'), 10);
			var maxFontSize = parseInt(Z.Utils.getResource('DEFAULT_MAXHOTSPOTCAPTIONFONTSIZE'), 10);
			var scaledFontSize = Math.round(defaultFontSize * scale);
			var constrainedFontSize = 2 * (( scaledFontSize < minFontSize) ? minFontSize : (( scaledFontSize > maxFontSize) ? maxFontSize : scaledFontSize));

			// Create caption text node and container, and set font style.
			var padding = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONPADDING'), 10) * scale;

			// Draw tile name white.
			var tileNameTextBox = Z.Utils.createContainerElement(zvIntID, 'div', 'tileNameTextBox', 'inline-block', 'absolute', 'hidden', 'auto', 'auto', '1px', '1px', 'none', '0px', 'transparent none', '0px', padding + 'px', 'nowrap');
			var tileNameTextNode = document.createTextNode(tileName);
			tileNameTextBox.appendChild(tileNameTextNode);
			container.appendChild(tileNameTextBox);
			Z.Utils.setTextNodeStyle(tileNameTextNode, 'white', 'verdana', constrainedFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none');

			// Draw tile name black.
			var tileNameTextBox2 = Z.Utils.createContainerElement(zvIntID, 'div', 'tileNameTextBox2', 'inline-block', 'absolute', 'hidden', 'auto', 'auto', '1px', '1px', 'none', '0px', 'transparent none', '0px', padding + 'px', 'nowrap');
			var tileNameTextNode2 = document.createTextNode(tileName);
			tileNameTextBox2.appendChild(tileNameTextNode2);
			container.appendChild(tileNameTextBox2);
			Z.Utils.setTextNodeStyle(tileNameTextNode2, 'black', 'verdana', constrainedFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none');

			// Position tile name. Must occur after added to display because text container width setting is 'auto'.
			var padding = parseFloat(tileNameTextBox.style.padding);
			var computedW = parseFloat(Z.Utils.getElementStyleProperty(tileNameTextBox, 'width'));
			if (isNaN(computedW)) {
				// Workaround for IE failure to report text container element width if setting is 'auto'.
				var font2Pixels = parseFloat(Z.Utils.getResource('DEFAULT_FONTTOPIXELSCONVERSIONFACTOR'));
				var ratioPixs2Chars = parseFloat(tileNameTextBox.style.fontSize) / font2Pixels;
				computedW = Math.round(parseFloat(tileName.length * ratioPixs2Chars));
			}
			var tileScaledW = TILE_WIDTH * scale / 2;
			var tileScaledH = TILE_HEIGHT * scale / 2;
			tileNameTextBox.style.left = ((x * scale) + ((tileScaledW - (computedW / 2)) - padding)) + 'px';
			tileNameTextBox.style.top = ((y * scale) + tileScaledH) + 'px';
			tileNameTextBox2.style.left = (1 + (x * scale) + ((tileScaledW - (computedW / 2)) - padding)) + 'px';
			tileNameTextBox2.style.top = (1 + (y * scale) + tileScaledH) + 'px';

			// Prevent text selection and context menu.
			Z.Utils.addEventListener(tileNameTextBox, 'contextmenu', Z.Utils.preventDefault);
			Z.Utils.disableTextInteraction(tileNameTextNode);
			Z.Utils.addEventListener(tileNameTextBox2, 'contextmenu', Z.Utils.preventDefault);
			Z.Utils.disableTextInteraction(tileNameTextNode2);
		}
		


		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//::::::::::::::::::: CALCULATION & CONVERSION FUNCTIONS ::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		this.getClickCoordsAtZoom = function (event, zoom) {
			var imageClickPt = this.getClickCoordsInImage(event, zoom);
			var imageX = imageClickPt.x;
			var imageY = imageClickPt.y;
			var zoomedX = imageX * zoom;
			var zoomedY = imageY * zoom;
			var zoomedClickPt = new Z.Utils.Point(zoomedX, zoomedY);
			return zoomedClickPt;
		}

		this.getClickCoordsInImage = function (event, zoom, mPt) {
			var event = Z.Utils.event(event);
			var imageClickPt = null;
			if (event) {
				var eventType = event.type;

				if (typeof zoom === 'undefined' || zoom == null) {
					zoom = getZoom();
				}
				if (typeof mPt === 'undefined' || mPt === null) {
					if (eventType == 'touchstart' || eventType == 'touchend' || eventType == 'touchcancel') {
						touch = Z.Utils.getFirstTouch(event);
						if (typeof touch !== 'undefined') {
							target = touch.target;
							mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
						}
					} else {
						target = Z.Utils.target(event);
						relatedTarget = Z.Utils.relatedTarget(event);
						mPt = Z.Utils.getMousePosition(event);
					}
				}

				if (typeof mPt !== 'undefined' && mPt !== null) {
					var viewportClickPt = thisViewport.convertPageCoordsToViewportCoords(mPt.x, mPt.y);
					imageClickPt = thisViewport.convertViewportCoordsToImageCoords(viewportClickPt.x, viewportClickPt.y, zoom);
				}
			}
			return imageClickPt;
		}

		function getClickZoomCoords3DAsString (event) {
			var event = Z.Utils.event(event);
			var zVal = getZoom();
			var clickPt = thisViewport.getClickCoordsInImage(event, zVal);
			var xString = Math.round(clickPt.x).toString();
			var yString = Math.round(clickPt.y).toString();
			var zString = (Math.round(zVal * 1000)/10).toString();
			var coordsString = 'X="' + xString + '"   Y="' + yString + '"   ZOOM="' + zString + '"';

			// Alternative display, simpler view, less useful for pasting to hotspots XML file.
			// var coordsString = 'X ' + xString + ' px   Y ' + yString + ' px   Z ' + zString + ' %';

			return coordsString;
		}

		this.getClickZoomCoords3D = function (event, pageClickPt, tCurrent, tScale, dblClick) {
			// Set condition for zooming in or out by more than one tier.
			var tierSkipThreshold = parseFloat(Z.Utils.getResource('DEFAULT_CLICKZOOMTIERSKIPTHRESHOLD'));

			// Calculate image coordinates of click and set default target zoom.
			var viewportClickPt = thisViewport.convertPageCoordsToViewportCoords(pageClickPt.x, pageClickPt.y);
			var imageClickPt = thisViewport.convertViewportCoordsToImageCoords(viewportClickPt.x, viewportClickPt.y, thisViewer.imageZ);
			var targetZ = convertTierScaleToZoom(tCurrent, tScale);
			var isAltKey = event.altKey;

			// Calculate target zoom for next or prior tier. If very close to next tier, skip over it.
			if (!dblClick) {
				// Zoom-in.
				if (!isAltKey) {
					// Zoom-in to next tier.
					if (tScale < 1 - tierSkipThreshold) {
						targetZ = convertTierScaleToZoom(tCurrent, 1);
					} else if (tCurrent < tierCount - 1) {
						targetZ = convertTierScaleToZoom(tCurrent + 1, 1);
					} else if (thisViewer.maxZ > 1) {
						targetZ = thisViewer.maxZ; // Special case: one click-zoom to max zoom > 100%.
					}

				} else {
					// Zoom-in to max zoom.
					targetZ = thisViewer.maxZ;
				}

			} else{
				// Zoom-out.
				if (!isAltKey) {
					// Scale current tier to zoom-to-fit, or current tier to 1, or prior tier to 1.
					var zFitScale = convertZoomToTierScale(tCurrent, thisViewer.fitZ);

					if (tScale - zFitScale < tierSkipThreshold) {
						targetZ = thisViewer.fitZ;
					} else if (tScale > 1 + tierSkipThreshold) {
						targetZ = convertTierScaleToZoom(tCurrent, 1);
					} else if (tCurrent > 0) {
						targetZ = convertTierScaleToZoom(tCurrent - 1, 1);
					} else if (thisViewer.tileSource == 'unconverted') {
						targetZ = thisViewer.fitZ;
					}

				} else {
					// Zoom-out to zoom-to-fit.
					targetZ = thisViewer.fitZ;
				}
			}

			return new Z.Utils.Point3D(imageClickPt.x, imageClickPt.y, targetZ);
		}

		this.calculateCurrentCenterCoordinates = function (viewportPt, z, r) {
			if (typeof viewportPt === 'undefined' || viewportPt === null) { var viewportPt = new Z.Utils.Point(parseFloat(cS.left), parseFloat(cS.top)); }
			if (typeof r === 'undefined' || r === null) { r = thisViewport.getRotation(); }
			if (r < 0) { r += 360; } // Ensure positive values.
			if (typeof z === 'undefined' || z === null) { z = getZoom(); }

			var currentX = Math.round(thisViewer.imageX - ((viewportPt.x - displayL) / z));
			var currentY = Math.round(thisViewer.imageY - ((viewportPt.y - displayT) / z));
			var currentPtRotated = Z.Utils.getPositionRotated(currentX, currentY, thisViewer.imageX, thisViewer.imageY, -r, thisViewer.imageR);

			return new Z.Utils.Point(currentPtRotated.x, currentPtRotated.y);
		}

		// Get bounding box in image tiles for current view. Use tier parameter to current or backfill tier.
		// Use parameter viewportOnly to narrow bounds to view area, excluding pan buffer.
		// Use parameter viewCenterOnly to narrow bounds to view area as-if zoomed in to specified tier - used for preloading feature.
		this.getViewportDisplayBoundingBoxInTiles = function (tier, viewportOnly, viewCenterOnly, partials) {
			return getViewportDisplayBoundingBoxInTiles(tier, viewportOnly, viewCenterOnly, partials);
		}
		
		function getViewportDisplayBoundingBoxInTiles (tier, viewportOnly, viewCenterOnly, partials) {
			if (typeof tier === 'undefined' || tier === null) { tier = tierCurrent; }
			if (typeof viewportOnly === 'undefined' || viewportOnly === null) { viewportOnly = false; }
			var viewCenterTier = (viewCenterOnly) ? tier : null;
			return new BoundingBoxInTiles(getViewportDisplayBoundingBoxInPixels(viewportOnly, viewCenterTier, partials), tier);
		}

		// Get bounding box coordinates in image pixels for current view plus pan buffer border area.
		this.getViewportDisplayBoundingBoxInPixels = function (viewportOnly, vTier, partials) {
			return getViewportDisplayBoundingBoxInPixels(viewportOnly, vTier, partials);
		}
		
		function getViewportDisplayBoundingBoxInPixels (viewportOnly, vTier, partials) {

			// Allow for pan in progress via movement of display.
			var canvasOffsetL = parseFloat(cS.left) - displayL;
			var canvasOffsetT = parseFloat(cS.top) - displayT;

			// Allow for CSS scaling calculations.
			if (thisViewer.useCanvas) {
				var cssScale = parseFloat(cS.width) / cD.width;
				canvasOffsetL /= cssScale;
				canvasOffsetT /= cssScale;
			}

			// Convert offset pixels of any pan in progress to image pixels.
			var currentZ = getZoom();
			if (canvasOffsetL != 0) { canvasOffsetL /= currentZ; }
			if (canvasOffsetT != 0) { canvasOffsetT /= currentZ; }

			var ctrX = thisViewer.imageX - canvasOffsetL;
			var ctrY = thisViewer.imageY - canvasOffsetT;
			var ctrToLeft, ctrToTop, ctrToRight, ctrToBottom;
			if (viewportOnly) {
				ctrToLeft = -(viewW / 2);
				ctrToRight = (viewW / 2);
				ctrToTop = -(viewH / 2);
				ctrToBottom = (viewH / 2);

			} else {
				ctrToLeft = -(displayW / 2);
				ctrToRight = (displayW / 2);
				ctrToTop = -(displayH / 2);
				ctrToBottom = (displayH / 2);
			}

			return new BoundingBoxInPixels(ctrX, ctrY, ctrToLeft, ctrToRight, ctrToTop, ctrToBottom, currentZ, vTier, partials);
		}

		this.HotspotsAllBoundingBoxInPixels = function () {
			// Find smallest and largest values, and related hotspots indices.
			var hC = new HotspotContext();
			var smallestX = thisViewer.imageCtrX;
			var largestX = thisViewer.imageCtrX;
			var smallestY = thisViewer.imageCtrY;
			var largestY = thisViewer.imageCtrY;

			for (var i = 0, j = hotspots.length; i < j; i++) {
				var hotspot = hotspots[i];
				var hotDims = new HotspotDimensions(hotspot, hC, null, true);
				var l = hotspot.x - (hotDims.w / 2);
				var r = hotspot.x + (hotDims.w / 2);
				var t = hotspot.y - (hotDims.h / 2);
				var b = hotspot.y + (hotDims.h / 2);

				if (l < smallestX) { smallestX = l; }
				if (r > largestX) { largestX = r; }
				if (t < smallestY) { smallestY = t; }
				if (b > largestY) { largestY = b; }
			}

			// Add margin beyond smallest and largest values.
			var labelMargin = parseInt(Z.Utils.getResource('DEFAULT_SAVEIMAGELABELMARGIN'), 10);
			smallestX -= labelMargin;
			smallestY -= labelMargin;
			largestX += labelMargin;
			largestY += labelMargin;

			// Recalculate center values.
			var ctrX = smallestX + ((largestX - smallestX) / 2);
			var ctrY = smallestY + ((largestY - smallestY) / 2);

			this.l = smallestX;
			this.r = largestX;
			this.t = smallestY;
			this.b = largestY;
			this.x = ctrX;
			this.y = ctrY;
		}

		function BoundingBoxInTiles (pixelsBoundingBox, tier) {
			// Caculate edges of view in image tiles of the current tier.
			var tierCurrentZoomUnscaled = convertTierScaleToZoom(tier, 1);
			var viewTileL = Math.floor(pixelsBoundingBox.l * tierCurrentZoomUnscaled / TILE_WIDTH);
			var viewTileR = Math.floor(pixelsBoundingBox.r * tierCurrentZoomUnscaled / TILE_WIDTH);
			var viewTileT = Math.floor(pixelsBoundingBox.t * tierCurrentZoomUnscaled / TILE_HEIGHT);
			var viewTileB = Math.floor(pixelsBoundingBox.b * tierCurrentZoomUnscaled / TILE_HEIGHT);

			// Constrain edge tile values to existing columns and rows.
			if (viewTileL < 0) { viewTileL = 0; }
			if (viewTileR > tierWInTiles[tier] - 1) { viewTileR = tierWInTiles[tier] - 1; }
			if (viewTileT < 0) { viewTileT = 0; }
			if (viewTileB > tierHInTiles[tier] - 1) { viewTileB = tierHInTiles[tier] - 1; }

			this.l = viewTileL;
			this.r = viewTileR;
			this.t = viewTileT;
			this.b = viewTileB;
		}

		function BoundingBoxInPixels (x, y, vpPixelsLeft, vpPixelsRight, vpPixelsTop, vpPixelsBottom, zoom, vTier, partials) {
			// Convert any bounding box from viewport pixels to image pixels.
			if (typeof vTier === 'undefined' || vTier === null) {
				this.l = x + vpPixelsLeft / zoom;
				this.r = x + vpPixelsRight / zoom;
				this.t = y + vpPixelsTop / zoom;
				this.b = y + vpPixelsBottom / zoom;
			} else {
				// Use vTier to calculate scale factor in place of zoom for preloading.
				var viewWRatio = viewW / tierWs[vTier];
				var viewHRatio = viewH / tierHs[vTier];
				this.l = x + vpPixelsLeft * viewWRatio;
				this.r = x + vpPixelsRight * viewWRatio;
				this.t = y + vpPixelsTop * viewHRatio;
				this.b = y + vpPixelsBottom * viewHRatio;
			}
			if (partials) {
				// Expand box out to nearest tile edge to enable caching of tiles partially in view. Used when preloading single image.
				this.l = this.l - (256 - this.l % 256);
				this.r = this.r + (256 - this.r % 256);
				this.t = this.t - (256 - this.t % 256);
				this.b = this.b + (256 - this.b % 256);
			}
		}

		// Returns coordinates within viewport display object including visible display area and out of view pan buffer area.
		this.convertPageCoordsToViewportDisplayCoords = function (pagePixelX, pagePixelY) {
			var viewportPt = thisViewport.convertPageCoordsToViewportCoords(pagePixelX, pagePixelY);
			var vpdPixelX = viewportPt.x - displayL;
			var vpdPixelY = viewportPt.y - displayT;
			return new Z.Utils.Point(vpdPixelX, vpdPixelY);
		}

		// Returns coordinates within web page using coordinates in display object including visible display area and out of view pan buffer area.
		this.convertViewportDisplayCoordsToPageCoords = function (vpdPixelX, vpdPixelY) {
			var vpPixelX = vpdPixelX + displayL;
			var vpPixelY = vpdPixelY + displayT;
			var pagePixelPt = thisViewport.convertViewportCoordsToPageCoords(vpPixelX, vpPixelY);
			return new Z.Utils.Point(pagePixelPt.x, pagePixelPt.y);
		}

		// Returns coordinates in viewport visible display area.
		this.convertPageCoordsToViewportCoords = function (pagePixelX, pagePixelY) {
			var pagePixelPt = Z.Utils.getElementPosition(viewportDisplay);
			var vpPixelX = pagePixelX - pagePixelPt.x + displayL;
			var vpPixelY = pagePixelY - pagePixelPt.y + displayT;
			return new Z.Utils.Point(vpPixelX, vpPixelY);
		}

		// Returns coordinates in web page.
		this.convertViewportCoordsToPageCoords = function (vpPixelX, vpPixelY) {
			var pagePixelPt = Z.Utils.getElementPosition(viewportDisplay);
			var pagePixelX = vpPixelX + pagePixelPt.x - displayL;
			var pagePixelY = vpPixelY + pagePixelPt.y - displayT;
			return new Z.Utils.Point(pagePixelX, pagePixelY);
		}

		this.convertPageCoordsToImageCoords = function (pagePixelX, pagePixelY) {
			var viewportPt = thisViewport.convertPageCoordsToViewportCoords(pagePixelX, pagePixelY);
			var imagePixelPt = thisViewport.convertViewportCoordsToImageCoords(viewportPt.x, viewportPt.y, thisViewer.imageZ);
			return new Z.Utils.Point(imagePixelPt.x, imagePixelPt.y);
		}

		this.convertImageCoordsToPageCoords = function (imageX, imageY, z, r) {
			var viewportPt = thisViewport.convertImageCoordsToViewportCoords(imageX, imageY, z, r);
			var pagePixelPt = thisViewport.convertViewportCoordsToPageCoords(viewportPt.x, viewportPt.y, thisViewer.imageZ);
			return new Z.Utils.Point(pagePixelPt.x, pagePixelPt.y);
		}

		this.convertViewportCoordsToImageCoords = function (viewportX, viewportY, z, r) {
			if (typeof z === 'undefined' || z === null) { z = thisViewer.imageZ; }
			if (typeof r === 'undefined' || r === null) { r = thisViewer.imageR; }
			if (r < 0) { r += 360; } // Ensure positive values.

			// Calculate current viewport center.
			var viewportCtrX = parseFloat(cS.left) + displayCtrX;
			var viewportCtrY = parseFloat(cS.top) + displayCtrY;

			// Calculate delta of input values from viewport center.
			var viewportDeltaX = viewportX - viewportCtrX;
			var viewportDeltaY = viewportY - viewportCtrY;

			// Correct coordinates for freehand drawing and polygon editing.
			if (thisViewer.imageR != 0) {
				viewportClickPt = Z.Utils.rotatePoint(viewportDeltaX, viewportDeltaY, r);
				viewportDeltaX = viewportClickPt.x;
				viewportDeltaY = viewportClickPt.y;
			}

			// Scale delta to convert from viewport to image coordinates.
			var imageDeltaX = viewportDeltaX / z;
			var imageDeltaY = viewportDeltaY / z;

			// Combine with current image position to get image coordinates.
			var imageX = imageDeltaX + thisViewer.imageX;
			var imageY = imageDeltaY + thisViewer.imageY;

			return new Z.Utils.Point(imageX, imageY);
		}

		this.convertImageCoordsToViewportCoords = function (imageX, imageY, z, r) {
			if (imageX == 'center' || isNaN(parseFloat(imageX))) { imageX = thisViewer.imageCtrX; }
			if (imageY == 'center' || isNaN(parseFloat(imageY))) { imageY = thisViewer.imageCtrY; }
			if (typeof z === 'undefined' || z === null) { z = thisViewer.imageZ; }
			if (typeof r === 'undefined' || r === null) { r = thisViewer.imageR; }
			if (r < 0) { r += 360; } // Ensure positive values.

			// Calculate delta of input values from current image position.
			var imageDeltaX = imageX - thisViewer.imageX ;
			var imageDeltaY = imageY - thisViewer.imageY;

			// Scale delta to convert from image to viewport coordinates.
			var viewportDeltaX = imageDeltaX * z;
			var viewportDeltaY = imageDeltaY * z;

			// Correct coordinates for click-zoom, alt-click-zoom, and click-pan.
			if (thisViewer.imageR != 0) {
				viewportClickPt = Z.Utils.rotatePoint(viewportDeltaX, viewportDeltaY, -r);
				viewportDeltaX = viewportClickPt.x;
				viewportDeltaY = viewportClickPt.y;
			}

			// Calculate current viewport center.
			var viewportCtrX = parseFloat(cS.left) + displayCtrX;
			var viewportCtrY = parseFloat(cS.top) + displayCtrY;

			// Convert display current to viewport target.
			var viewportX = viewportDeltaX + viewportCtrX;
			var viewportY = viewportDeltaY + viewportCtrY;

			return new Z.Utils.Point(viewportX, viewportY);
		}

		this.convertImageCoordsToViewportEdgeCoords = function (imageX, imageY, z, r) {
			convertImageCoordsToViewportEdgeCoords(imageX, imageY, z, r);
		}
		
		function convertImageCoordsToViewportEdgeCoords (imageX, imageY, z, r) {
			if (typeof z === 'undefined' || z === null) { z = thisViewer.imageZ; }
			if (typeof r === 'undefined' || r === null) { r = thisViewer.imageR; }
			if (r < 0) { r += 360; } // Ensure positive values.

			// Calculate delta of input values from current image position.
			var imageDeltaX = thisViewer.imageX - imageX;
			var imageDeltaY = thisViewer.imageY - imageY;

			// Scale delta to convert from image to viewport coordinates.
			var viewportDeltaX = imageDeltaX * z;
			var viewportDeltaY = imageDeltaY * z;

			// Correct coordinates for click-zoom, alt-click-zoom, and click-pan.
			if (thisViewer.imageR != 0) {
				viewportClickPt = Z.Utils.rotatePoint(viewportDeltaX, viewportDeltaY, -r);
				viewportDeltaX = viewportClickPt.x;
				viewportDeltaY = viewportClickPt.y;
			}

			// Convert display current to viewport target.
			var displayTargetL = displayL + viewportDeltaX;
			var displayTargetT = displayT + viewportDeltaY;

			return new Z.Utils.Point(displayTargetL, displayTargetT);
		}

		this.convertViewportEdgeCoordsToImageCoords = function (displayTargetL, displayTargetT, z, r) {
			convertViewportEdgeCoordsToImageCoords(displayTargetL, displayTargetT, z, r);
		}
		
		function convertViewportEdgeCoordsToImageCoords (displayTargetL, displayTargetT, z, r) {
			if (typeof z === 'undefined' || z === null) { z = thisViewer.imageZ; }
			if (typeof r === 'undefined' || r === null) { r = thisViewer.imageR; }
			if (r < 0) { r += 360; } // Ensure positive values.

			// Convert display current to viewport target.
			var viewportDeltaX = displayTargetL - displayL;
			var viewportDeltaY = displayTargetT - displayT;

			// Correct coordinates for click-zoom, alt-click-zoom, and click-pan.
			if (thisViewer.imageR != 0) {
				viewportClickPt = Z.Utils.rotatePoint(viewportDeltaX, viewportDeltaY, -r);
				viewportDeltaX = viewportClickPt.x;
				viewportDeltaY = viewportClickPt.y;
			}

			// Scale delta to convert from image to viewport coordinates.
			var imageDeltaX = viewportDeltaX / z;
			var imageDeltaY = viewportDeltaY / z;

			// Calculate delta of input values from current image position.
			var imageX = thisViewer.imageX - imageDeltaX;
			var imageY = thisViewer.imageY - imageDeltaY;

			return new Z.Utils.Point(imageX, imageY);
		}

		this.calculateZoomToFit = function (w, h, targetR) {
			return calculateZoomToFit(w, h, targetR);
		}
		
		function calculateZoomToFit (w, h, targetR) {
			// Determine zoom to fit the entire image in the viewport. This may leave empty space on the sides or on the top and bottom, depending on the aspect ratios of the image and the viewport.

			// If w and h for rectangle not provided, use image dimensions.
			if (typeof w === 'undefined' || w === null) { w = thisViewer.imageW; }
			if (typeof h === 'undefined' || h === null) { h = thisViewer.imageH; }

			// Alternative creates space around image for annotating.
			//var marginPercent = 1.2;
			//return ((w * marginPercent) / (h * marginPercent) > viewW / viewH) ? viewW / (w * marginPercent) : viewH / (h * marginPercent);

			var zoomToFitValue = (w / h > viewW / viewH) ? viewW / w : viewH / h;
			if (targetR == 90 || targetR == 270) {
				zoomToFitValue = (w / h > viewW / viewH) ? viewW / h : viewH / w;
			}

			return zoomToFitValue;
		}

		this.calculateZoomToFill = function (w, h, targetR) {
			return calculateZoomToFill(w, h, targetR);
		}
		
		function calculateZoomToFill (w, h, targetR) {
			// Determine zoom to fill the viewport and leave no empty space on the sides or top and bottom, regardless of the aspect ratios of the image and the viewport.

			// If w and h for rectangle not provided, use image dimensions.
			if (typeof w === 'undefined' || w === null) { w = thisViewer.imageW; }
			if (typeof h === 'undefined' || h === null) { h = thisViewer.imageH; }

			var zoomToFillValue = (w / h > viewW / viewH) ? viewH / h : viewW / w;
			if (targetR == 90 || targetR == 270) {
				zoomToFillValue = (w / h > viewW / viewH) ? viewH / w : viewW / h;
			}

			return zoomToFillValue;
		}

		this.calculateZoomForResize = function (currZ, priorViewW, priorViewH, newViewW, newViewH) {
			var newZ = currZ;
			var currImgW = thisViewer.imageW * currZ;
			var currImgH = thisViewer.imageH * currZ;
			var deltaViewW = newViewW / priorViewW;
			var deltaViewH = newViewH / priorViewH;
			if (currImgW < newViewW && currImgH < newViewH) {
				newZ = currZ;
			} else if (currImgW == newViewW && currImgH < newViewH) {
				newZ = -1;
			} else if (currImgW < newViewW && currImgH == newViewH) {
				newZ = -1;
			} else if (currImgW > newViewW && currImgH <= newViewH) {
				newZ = currZ * deltaViewW;
			} else if (currImgW <= newViewW && currImgH > newViewH) {
				newZ = currZ * deltaViewH;
			} else if (currImgW > newViewW && currImgH > newViewH) {
				var deltaView = 1;
				if (deltaViewW >= 1 && deltaViewH >= 1) {
					deltaView = (deltaViewW > deltaViewH) ? deltaViewW : deltaViewH;
				} else if (deltaViewW <= 1 && deltaViewH <= 1) {
					deltaView = (deltaViewW < deltaViewH) ? deltaViewW : deltaViewH;
				}
				newZ = currZ * deltaView;
			}

			if (newZ < thisViewer.minZ) { newZ = thisViewer.minZ; }
			if (newZ > thisViewer.maxZ) { newZ = thisViewer.maxZ; }

			// Debug option: console.log(priorViewW, newViewW, priorViewH, newViewH, deltaZ, z, newZ);

			return newZ;
		}

		this.convertTierScaleToZoom = function (tier, scale) {
			var zoom = convertTierScaleToZoom(tier, scale);
			return zoom;
		}

		function convertTierScaleToZoom (tier, scale) {
			var zoom = scale * (tierWs[tier] / thisViewer.imageW);
			return zoom;
		}

		function convertZoomToTierScale (tier, zoom) {
			var scale = zoom / (tierWs[tier] / thisViewer.imageW);
			return scale;
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::: CONSTRAIN & SYNC FUNCTIONS :::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		function constrainPan (x, y, z, r, input) {
			// Limit target pan coordinates (view, setView, zoomAndPanToView) or new
			// display container position (mouse, touch, navigator, key, slider-zoom).

			if (thisViewer.constrainPan) {
				// Validate and record input values.
				var z = (typeof z !== 'undefined' && z !== null) ? z : thisViewer.imageZ;
				var r = (typeof r !== 'undefined' && r !== null) ? Math.round(r) : Math.round(thisViewer.imageR);
				if (r < 0) { r += 360; } // Ensure positive values.
				var unconstrainedX = x, unconstrainedY = y;

				if (input == 'image') {
					// Convert image pixel values to viewport values.
					var newPt = convertImageCoordsToViewportEdgeCoords(x, y, z, r);
					x = newPt.x;
					y = newPt.y;
				}

				// Abbreviate input values.
				var iW = thisViewer.imageW;
				var iH = thisViewer.imageH;
				var iWz = Math.round(iW * z);
				var iHz = Math.round(iH * z);
				var iWz2 = Math.round((iW * z) / 2);
				var iHz2 = Math.round((iH * z) / 2);
				var vW = viewW;
				var vH = viewH;
				var vEdgeX = Math.round(viewW * 0.1);
				var vEdgeY = Math.round(viewH * 0.1);
				var vCtrX = Math.round(viewW * 0.5);
				var vCtrY = Math.round(viewH * 0.5);

				// Get viewport pixels coordinates of image center.
				var currX, currY;
				currX = (vCtrX - displayL) + (thisViewer.imageCtrX - thisViewer.imageX) * z + x;
				currY = (vCtrY - displayT) + (thisViewer.imageCtrY - thisViewer.imageY) * z + y;

				// Get viewport pixel coordinates at unrotated image corners.
				var imgULX = currX - iWz / 2;
				var imgULY = currY - iHz / 2;
				var imgURX = currX + iWz / 2;
				var imgURY = currY - iHz / 2;
				var imgBRX = currX + iWz / 2;
				var imgBRY = currY + iHz / 2;
				var imgBLX = currX - iWz / 2;
				var imgBLY = currY + iHz / 2;

				// Get viewport pixel coordinate points at rotated image corners.
				var imgPtULRot = Z.Utils.getPositionRotated(imgULX, imgULY, currX, currY, r, thisViewer.imageR);
				var imgPtURRot = Z.Utils.getPositionRotated(imgURX, imgURY, currX, currY, r, thisViewer.imageR);
				var imgPtBRRot = Z.Utils.getPositionRotated(imgBRX, imgBRY, currX, currY, r, thisViewer.imageR);
				var imgPtBLRot = Z.Utils.getPositionRotated(imgBLX, imgBLY, currX, currY, r, thisViewer.imageR);

				// Get rotated bounding box display coordinate points.
				var imgRotL = Math.min(imgPtULRot.x, imgPtURRot.x, imgPtBRRot.x, imgPtBLRot.x);
				var imgRotT = Math.min(imgPtULRot.y, imgPtURRot.y, imgPtBRRot.y, imgPtBLRot.y);
				var imgRotR = Math.max(imgPtULRot.x, imgPtURRot.x, imgPtBRRot.x, imgPtBLRot.x);
				var imgRotB = Math.max(imgPtULRot.y, imgPtURRot.y, imgPtBRRot.y, imgPtBLRot.y);
				// Debug option: console.log('left: ', imgRotL, '  top: ', imgRotT, '  right: ', imgRotR, '  bottom: ', imgRotB);

				// Determine if zoomed in or out.
				var imgRotW = imgRotR - imgRotL;
				var imgRotH = imgRotB - imgRotT;
				var zoomedInHorizontal = (imgRotW > vW);
				var zoomedInVertical = (imgRotH > vH);

				// Strict constrain limits trailing edge of image to far edge of display and center image when zoomed-out. Default 'relaxed' pan constraint limits trailing edge to viewport center. Loose constraint limits image center to viewport edge (allows image half out of view).
				if (zoomedInHorizontal || !thisViewer.constrainPanStrict) {
					if (thisViewer.constrainPanLimit == 3) { // Strict.
						x = (imgRotL > 0) ? x - imgRotL : (imgRotR < vW) ? x - (imgRotR - vW) : x;
					} else if (thisViewer.constrainPanLimit == 2) { // Relaxed (default).
						x = (imgRotL > vCtrX) ? x - (imgRotL - vCtrX) : (imgRotR < vCtrX) ? x - (imgRotR - vCtrX) : x;
					} else if (thisViewer.constrainPanLimit == 1) { // Loose.
						x = (imgRotL > vEdgeX * 9) ? x - (imgRotL - vEdgeX * 9) : (imgRotR < vEdgeX) ? x - (imgRotR - vEdgeX) : x;
					}
				} else {
					x = (imgRotL > (vCtrX - iWz / 2)) ? x - (imgRotL - (vCtrX - iWz / 2)) : (imgRotR < vCtrX + iWz / 2) ? x - (imgRotR - (vCtrX + iWz / 2)) : x;
				}
				if (zoomedInVertical || !thisViewer.constrainPanStrict) {
					if (thisViewer.constrainPanLimit == 3) { // Strict.
						y = (imgRotT > 0) ? y - imgRotT : (imgRotB < vH) ? y - (imgRotB - vH) : y;
					} else if (thisViewer.constrainPanLimit == 2) { // Relaxed (default).
						y = (imgRotT > vCtrY) ? y - (imgRotT - vCtrY) : (imgRotB < vCtrY) ? y - (imgRotB - vCtrY) : y;
					} else if (thisViewer.constrainPanLimit == 1) { // Loose.
						y = (imgRotT > vEdgeY * 9) ? y - (imgRotT - vEdgeY * 9) : (imgRotB < vEdgeY) ? y - (imgRotB - vEdgeY) : y;
					}
				} else {
					y = (imgRotT > (vCtrY - iHz / 2)) ? y - (imgRotT - (vCtrY - iHz / 2)) : (imgRotB < vCtrY + iHz / 2) ? y - (imgRotB - (vCtrY + iHz / 2)) : y;
				}

				if (input == 'image') {
					// Convert viewport values to image pixel values.
					var newPt = convertViewportEdgeCoordsToImageCoords(x, y, z, r);
					x = newPt.x;
					y = newPt.y;
				}

				// Validate pan constraint callback.
				if (x != unconstrainedX || y != unconstrainedY) {
					x = Math.round(x);
					y = Math.round(y);
					validateCallback('panConstrained');
				}
			}

			return new Z.Utils.Point(x, y);
		}

		// Ensure image is not zoomed beyond specified min and max values.
		function constrainZoom (z) {
			if (z > thisViewer.maxZ) {
				z = thisViewer.maxZ;
				validateCallback('zoomConstrainedMax');
			} else if (z < thisViewer.minZ) {
				z = thisViewer.minZ;
				validateCallback('zoomConstrainedMin');
			}
			return z;
		}

		function constrainRotation (targetR) {
			// Constrain to integer values in increments of 90 or -90 degrees.
			if (!thisViewer.rotationFree) {
				targetR = Math.round(Math.abs(targetR) / 90) * 90 * Z.Utils.getSign(targetR);
			}

			// Constrain to 0 to 359 range. Reset display at constraints to avoid backspin.
			if (targetR <= -360) {
				targetR += 360;
			} else if (targetR >= 360) {
				targetR -= 360;
			}

			return targetR;
		}

		// Set toolbar slider button position.
		function syncToolbarSliderToViewport () {
			if (thisViewer.Toolbar && thisViewer.ToolbarDisplay && thisViewer.Toolbar.getInitialized()) {
				var currentZ = getZoom();
				thisViewer.Toolbar.syncSliderToViewportZoom(currentZ);
			}
			validateCallback('viewZoomingGetCurrentZoom');
		}

		function syncNavigatorToViewport () {
			// Set navigator rectangle size and position.
			if (!thisViewer.comparison || viewportID == 0) {
				if (thisViewer.Navigator) { thisViewer.Navigator.syncToViewport(); }
			} else {
				if (thisViewer.Navigator2) { thisViewer.Navigator2.syncToViewport(); }
			}
		}

		function syncRulerToViewport () {
			// Set ruler scale bar text.
			if (thisViewer.Ruler && thisViewer.Ruler.getInitialized()) {
				thisViewer.Ruler.syncToViewport();
			}
		}

		this.syncViewportToNavigator = function (newVPImgCtrPt) {
			var r = thisViewer.imageR;
			if (r < 0) { r += 360; } // Ensure positive values.
			var constrainedPt = constrainPan(newVPImgCtrPt.x, newVPImgCtrPt.y, thisViewer.imageZ, r, 'image');
			var zX = thisViewer.imageX;
			var zY = thisViewer.imageY;
			var nX = constrainedPt.x;
			var nY = constrainedPt.y;

			// Allow for rotation.
			var rdX = dX = zX - nX;
			var rdY = dY = zY - nY;
			if (r != 0) {
				if (r >= 270) {
					rdX = dY;
					rdY = -dX;
				} else if (r >= 180) {
					rdX = -dX;
					rdY = -dY;
				} else if (r >= 90) {
					rdX = -dY;
					rdY = dX;
				}
			}

			// Allow for prior display scaling and default offset.
			var deltaX = rdX * thisViewer.imageZ;
			var deltaY = rdY * thisViewer.imageZ;
			var newX = deltaX + displayL;
			var newY = deltaY + displayT;

			// Sync viewport display to navigator rectangle.
			cS.left = newX + 'px';
			cS.top = newY + 'px';

			if (oD && tierBackfillDynamic && (Z.mobileDevice || (Math.abs(deltaX) > (viewW / 2) || Math.abs(deltaY) > (viewH / 2)))) {
				redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
			}
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::: VALIDATION FUNCTIONS CACHE, STATUS, VIEW, AND PROGRESS ::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		// Verify cached tiles less than maximum permitted by resourced constant. Approach assumes cache arrays are filled in sync and never sorted so orders match.
		function validateCache (imgFilter) {
			if (imgFilter) {
				while (tileImages.length > TILES_CACHE_MAX) {
					tileImages = Z.Utils.arraySplice(tileImages, 0, 1);
				}
			} else {
				while (tilesCachedNames.length > TILES_CACHE_MAX && tilesCached.length > TILES_CACHE_MAX) {
					tilesCachedNames = Z.Utils.arraySplice(tilesCachedNames, 0, 1);
					tilesCached = Z.Utils.arraySplice(tilesCached, 0, 1);
				}
			}
		}

		// Tiles and tile names added to end of cache arrays or moved to end if already included.
		function cacheTile (tile) {
			if (TILES_CACHE_MAX > 0) {
				var index = Z.Utils.arrayIndexOf(tilesCachedNames, tile.name);
				if (index != -1) {
					tilesCachedNames = Z.Utils.arraySplice(tilesCachedNames, index, 1);
					tilesCached = Z.Utils.arraySplice(tilesCached, index, 1);
				}
				tilesCachedNames[tilesCachedNames.length] = tile.name;
				tilesCached[tilesCached.length] = tile;
			}
			// Debug option: console.log(tilesCached.length + '  ' + tilesCached[tilesCached.length - 1].name + '  ' + tilesCachedNames.length + '  ' + tilesCachedNames[tilesCachedNames.length - 1]);
		}

		this.getStatus = function (vState) {
			return getStatus(vState);
		}
		
		function getStatus (vState) {
			var index = Z.Utils.arrayIndexOfObjectValue(viewportStatus, 'state', vState);
			var statusVal = (index == -1) ? false : viewportStatus[index].status;
			return statusVal;
		}

		this.setStatus = function (vState, vStatus) {
			setStatus(vState, vStatus);
		}
		
		function setStatus (vState, vStatus) {
			var notYetSet = false;
			var index = Z.Utils.arrayIndexOfObjectValue(viewportStatus, 'state', vState);
			if (index == -1) {
				notYetSet = vStatus;
				viewportStatus[viewportStatus.length] = { state:vState, status:vStatus};
			} else {
				if (!viewportStatus[index].status && vStatus) { notYetSet = true; }
				viewportStatus[index].status = vStatus;
			}
			if (notYetSet) {				
				validateCallback(vState);
				validateViewerStatus(vState);
			}
		}

		// Display debug information if parameter set. DEV NOTE: modification in progress to use viewportStatus values.
		this.traceDebugValues = function (step, infoTxt, infoNum, dataArr) {
			traceDebugValues(step, infoTxt, infoNum, dataArr);
		}
		
		function traceDebugValues (step, infoTxt, infoNum, dataArr) {
			var infoNumber = (typeof infoNum !== 'undefined' && infoNum !== null) ? infoNum : null;
			var infoText = (infoTxt !== null) ? infoTxt : '';

			// Calculate tracking values.
			switch (step) {
				case 'tilesToDisplay' :
					tilesToDisplay = infoNumber;
					tilesInCache = 0;
					tilesRequested = 0;
					tilesLoaded = 0;
					tilesDisplayed = 0;
					tilesWaiting = infoNumber;
					tilesTimeElapsed = 0;
					tilesTimeStart = new Date().getTime();
					tileLoadsPerSecond = 0;
					window.clearTimeout(validateViewTimer);
					validateViewTimer = null;
					validateViewTimer = window.setTimeout( validateViewTimerHandler, validateViewDelay);
					break;
				case 'tilesInCache' :
					tilesInCache = infoNumber;
					break;
				case 'loadTile-image-display' :
					tilesRequested += 1;
					break;
				case 'onTileLoad' :
					tilesLoaded += 1;
					var timeNow = new Date().getTime();
					tilesTimeElapsed = (timeNow - infoNumber) / 1000; // Seconds.
					tileLoadsPerSecond = tilesLoaded / tilesTimeElapsed;
					break;
				case 'displayTile' :
					// Increment displayed tiles counter and decrement waiting tiles counter and
					// ensure no duplicate counting for redisplays by removing from display list.
					var nameIndex = Z.Utils.arrayIndexOf(tilesDisplayingNames, infoText);
					if (nameIndex != -1) {
						tilesDisplayingNames.splice(nameIndex, 1);
						tilesDisplayed += 1;
						tilesWaiting -= 1;
					}
					break;
				case 'tilesBackfillToPrecache' :
					tilesBackfillToPrecache = infoNumber;
					break;
				case 'onTileBackfillPrecache' :
					tilesBackfillToPrecacheLoaded += 1;
					break;
				case 'tilesBackfillToDisplay' :
					tilesBackfillToDisplay = infoNumber;
					tilesBackfillWaiting = infoNumber;
					break;
				case 'onTileBackfillLoad' :
					tilesBackfillLoaded += 1;
					break;
				case 'displayBackfillTile' :
					// Increment displayed tiles counter and decrement waiting tiles counter and
					// ensure no duplicate counting for redisplays by removing from display list.
					var nameIndex = Z.Utils.arrayIndexOf(tilesBackfillDisplayingNames, infoText);
					if (nameIndex != -1) {
						tilesBackfillDisplayingNames.splice(nameIndex, 1);
						tilesBackfillDisplayed += 1;
						tilesBackfillWaiting -= 1;
					}
					break;
			}

			// Display validation values.
			if (thisViewer.debug == 2 || thisViewer.debug == 3) {
				traceTileStatus(tilesToDisplay, tilesInCache, tilesRequested, tilesLoaded, tilesDisplayed, tilesWaiting);
			}

			// Debug options: Use zDebug=2 parameter to display messages below at appropriate steps during view updating.
			if (thisViewer.debug == 2) {
				var dataText = (typeof dataArr !== 'undefined' && dataArr !== null && dataArr.length > 0) ? dataArr.join(', ') : 'none';
				var blankLineBefore = false, blankLineAfter = true;
				var traceText = '';
				switch (step) {
					case 'updateView-noChange' :
						traceText = 'Updating view: no change of tier.';
						break;
					case 'tilesToDisplay' :
						traceText = 'Tiles to display: ' + dataText;
						break;
					case 'tilesInCache' :
						traceText = 'Tiles in cache: ' + dataText;
						break;
					case 'tilesToLoad' :
						traceText = 'Tiles to load: ' + dataText;
						break;
					case 'tilesToLoad-backfill' :
						traceText = 'Tiles to load-backfill: ' + dataText;
						break;
					case 'redisplayCachedTiles-viewportDisplay' :
						var cachedTileNames = [];
						for (var i = 0, j = dataArr.length; i < j; i++) { cachedTileNames[cachedTileNames.length] = dataArr[i].name; }
						traceText = 'Tiles from cache-' + infoText + ': ' + cachedTileNames.join(', ');
						break;
					case 'redisplayCachedTiles-backfillDisplay' :
						var cachedTileNames = [];
						for (var i = 0, j = dataArr.length; i < j; i++) { cachedTileNames[cachedTileNames.length] = dataArr[i].name; }
						traceText = 'Tiles from cache-' + infoText + ': ' + cachedTileNames.join(', ');
						break;
					case 'loadNewTiles-image-display' :
						traceText = 'Tile requests for display: ' + infoText + dataText;
						break;
					case 'loadNewTiles-image-backfill' :
						traceText = 'Tile requests for backfill: ' + infoText + dataText;
						break;
					case 'imageRequestTimeout' :
						traceText = 'Image request for ' + infoText;
						break;
					case 'loadTile-image-display' :
						traceText = 'Tile request-display: ' + infoText;
						blankLineAfter = false;
						break;
					case 'loadTile-image-backfill' :
						traceText = 'Tile request-backfill: ' + infoText;
						blankLineAfter = false;
						break;
					case 'loadTileDelayForOffset' :
						traceText = 'Tile not yet being loaded - offset chunk loading in progress: ' + infoText;
						break;
					case 'onTileLoad' :
						traceText = 'Tiles received-display: ' + infoText;
						blankLineAfter = false;
						break;
					case 'onTileBackfillLoad' :
						traceText = 'Tiles received-backfill: ' + infoText;
						if (tilesBackfillCachedNames.length == 0) { traceText += '\n\nTile loading complete for backfill: all requested tiles received.'; }
						blankLineAfter = false;
						break;
					case 'formatTilePathZIF' :
						traceText = 'Tile request recorded for after load offset chunk: ' + infoText;
						break;
					case 'selectTilesRetry' :
						traceText = 'Requesting tiles after offset chunk received: ' + dataText;
						break;
					case 'formatTilePathPFF' :
						traceText = 'Tile request recorded for after load offset chunk: ' + infoText;
						blankLineAfter = false;
						break;
					case 'selectTilesRetry' :
						traceText = 'Requesting tiles after offset chunk received: ' + dataText;
						blankLineAfter = false;
						break;
					case 'loadNewTilesRetry' :
						traceText = infoText;
						break;
					case 'displayTile' :
						traceText = 'Tile displaying: ' + infoText;
						blankLineAfter = false;
						break;
					case 'blankLine' :
						traceText = ' ';
						break;
				}

				if (traceText != '') { trace(traceText, blankLineBefore, blankLineAfter); }
			}
		}

		function validateViewTimerHandler () {			
			window.clearTimeout(validateViewTimer);
			validateViewTimer = null;

			var timeNow = new Date().getTime();
			tilesTimeElapsed = ((timeNow - tilesTimeStart) / 1000); // Seconds.

			var loadsExpected = (tileLoadsPerSecond * tilesTimeElapsed);
			var loadingDelay = (tilesWaiting && (tilesLoaded < loadsExpected));
			var displayDelay = (tilesWaiting && (tilesLoaded >= tilesRequested));

			// Display validate values.
			if (thisViewer.debug == 2 || thisViewer.debug == 3) {
				trace('View validation-time elapsed: ' + tilesTimeElapsed);
				if (tilesWaiting > 0) {
					if (loadingDelay) {
						trace('Loading delay - re-calling updateView');
					} else if (displayDelay) {
						trace('Display delay - re-calling updateView');
					} else {
						trace('Progress slow, resetting timer');
					}
				}
				trace('');
				thisViewer.traces.scrollTop = thisViewer.traces.scrollHeight;
				traceTileSpeed(tilesTimeElapsed, tileLoadsPerSecond);
			}

			// Validate speed values.
			if (tilesWaiting > 0) {
				if (validateViewRetryCounter < validateViewRetryLimit) {
					if (loadingDelay || displayDelay) {
						validateViewRetryCounter += 1;
						updateView(true);
					} else {
						validateViewTimer = window.setTimeout( validateViewTimerHandler, validateViewDelay);
					}
				} else {
					console.log(Z.Utils.getResource('ERROR_VALIDATEVIEW'));

					// Alternative implementation: Display status in Viewport.
					//thisViewer.showMessage(Z.Utils.getResource('ERROR_VALIDATEVIEW'), false, thisViewer.messageDurationStandard, 'center');
				}
			} else {
				validateViewRetryCounter = 0;

				// Debug option: console.log('viewUpdateComplete - time elapsed: ' + tilesTimeElapsed);
				validateCallback('viewUpdateComplete');
				validateCallback('viewUpdateCompleteGetLabelIDs');
			}
		}

		// Update progress indicator in toolbar.
		this.updateProgress = function (total, current) {
			thisViewer.updateViewPercent = calculateProgressPercent(total, current);
			if (thisViewer.Toolbar && thisViewer.ToolbarDisplay && thisViewer.Toolbar.getInitialized()) { thisViewer.Toolbar.updateProgress(total, current); }
		}

		function calculateProgressPercent (total, current) {
			if (total == 0 && current == 0) {
				// Debug option: console.log('loadingTilesComplete');
				validateCallback('loadingTilesComplete');
				validateCallback('loadingTilesCompleteGetLabelIDs');
			} else {
				var percentComplete = Math.round(100 - (current / total) * 100);
				return Math.round(percentComplete / 10);
			}
		}
		


		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::::: INTERACTION FUNCTIONS :::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		// DEV NOTES: Variable thisViewer.imageR updated during implementation of rotation rather than
		// once in updateView. This differs from updating of variables thisViewer.imageX/Y/Z. Comparison of
		// approaches in progress. Variable thisViewer.preventDupCall set to ensure values set by call in reset
		// function are not overridden by duplicated call in updateView function. Rounding required
		// because rotation functions currently support exact 90 degree increments only.
		function recordPriorViewCoordinates () {
			if (!thisViewer.preventDupCall) {
				thisViewer.priorX = Math.round(thisViewer.imageX);
				thisViewer.priorY = Math.round(thisViewer.imageY);
				thisViewer.priorZ = thisViewer.imageZ;
				thisViewer.priorR = Math.round(thisViewer.imageR);
			}
			thisViewer.preventDupCall = (typeof called !== 'undefined' && called !== null);
		}

		// Fast update of viewport position, scale, and rotation without updateView.
		this.setViewNoUpdate = function (cLeft, cTop, vWidth, vHeight, vLeft, vTop, bWidth, bHeight, bLeft, bTop, cRotation) {
			cS.left = cLeft;
			cS.top = cTop;
			vS.width = vWidth;
			vS.height = vHeight;
			vS.left = vLeft;
			vS.top = vTop;
			bS.width = bWidth;
			bS.height = bHeight;
			bS.left = bLeft;
			bS.top = bTop;
			cS.rotation = cRotation;
		}

		this.setView = function (x, y, z, r, callback, override) {
			view(x, y, z, r, callback, override);
		}

		// View assignment function.
		function view (x, y, z, r, callback, override) {
			if (!override) { thisViewport.zoomAndPanAllStop(); }
			if (thisViewer.maskingSelection && thisViewer.maskClearOnUserAction) { thisViewport.clearMask(); }

			// Validate coordinate values.
			if (typeof x === 'undefined' || x === null) { x = (thisViewer.imageW / 2); }
			if (typeof y === 'undefined' || y === null) { y = (thisViewer.imageH / 2); }

			if (typeof z === 'undefined' || z === null) {
				z = thisViewer.fitZ;
			} else if (z > 1 && z > thisViewer.maxZ) {
				z = z / 100;
			}
			if (typeof r === 'undefined' || r === null) { r = thisViewer.imageR; }

			// Constrain coordinate values.
			z = constrainZoom(z);
			r = constrainRotation(r);
			var constrainedPt = constrainPan(x, y, z, r, 'image');

			// Assign coordinate values.
			thisViewer.imageX = imageX = constrainedPt.x;
			thisViewer.imageY = imageY = constrainedPt.y;
			thisViewer.imageZ = z;

			// Apply coordinate values.
			if (r != thisViewer.imageR) { Z.Utils.rotateElement(cS, r, thisViewer.imageR); }
			thisViewer.imageR = r;
			updateView(true);
			if (typeof callback === 'function') { callback(); }
		}

		this.zoom = function (zoomDir) {
			// Avoid redundant calls resulting in redundant updateView calls below.
			if (zoomDir == 'stop' && thisViewer.zooming == 'stop') { return; }

			switch(zoomDir) {
				case 'out' :
					if (zoomVal >= 0) { zoomVal -= zoomStepDistance; }
					break;
				case 'in' :
					if (zoomVal <= 0) { zoomVal += zoomStepDistance; }
					break;
				case 'stop' :
					zoomVal = 0;
					break;
			}
			thisViewer.zooming = (zoomVal == 0) ? 'stop' : ((zoomVal > 0) ? 'in' : 'out');

			if (zoomVal !=0) {
				if (!zapTimer) {
					if (((zoomVal < 0) && (thisViewer.imageZ > thisViewer.minZ)) || ((zoomVal > 0) && (thisViewer.imageZ < thisViewer.maxZ))) {
						thisViewport.toggleWatermarks(false);
						if (hotspots && hotspots.length > 39) { thisViewport.setHotspotsVisibility(false); }
					}
					if (!thisViewer.useCanvas) { Z.Utils.clearDisplay(wD, thisViewer); }
					zapTimer = window.setTimeout(zoomAndPanContinuousStep, zapStepDuration);
				}
			} else {
				zoomAndPanContinuousStop();
				updateView();
				thisViewport.toggleWatermarks(true);
				if (hotspots && hotspots.length > 39) { thisViewport.setHotspotsVisibility(true); }
			}
		}

		// Pan direction refers to the pan of the view - the opposite of the movement of the image.
		this.pan = function (panDir) {
			// Avoid redundant calls resulting in redundant updateView calls below.
			if (panDir == 'horizontalStop' && thisViewer.panningX == 'stop') { return; }
			if (panDir == 'verticalStop' && thisViewer.panningY == 'stop') { return; }

			if (!thisViewer.tracking) {
				switch(panDir) {
					case 'left' :
						if (panX <= 0) { panX += panStepDistance; }
						break;
					case 'up' :
						if (panY <= 0) { panY += panStepDistance; }
						break;
					case 'down' :
						if (panY >= 0) { panY -= panStepDistance; }
						break;
					case 'right' :
						if (panX >= 0) { panX -= panStepDistance; }
						break;
					case 'horizontalStop' :
						panX = 0;
						break;
					case 'verticalStop' :
						panY = 0;
						break;
					case 'stop' :
						panX = 0;
						panY = 0;
						break;
				}
			}

			thisViewer.panningX = (panX == 0) ? 'stop' : ((panX > 0) ? 'left' : 'right');
			thisViewer.panningY = (panY == 0) ? 'stop' : ((panY > 0) ? 'up' : 'down');
			zapTierCurrentZoomUnscaledX = thisViewer.imageX * convertTierScaleToZoom(tierCurrent, 1);
			zapTierCurrentZoomUnscaledY = thisViewer.imageY * convertTierScaleToZoom(tierCurrent, 1);

			if (panX !=0 || panY != 0) {
				if (!zapTimer) {
					// Clear watermarks for faster, smoother zoom.
					thisViewport.toggleWatermarks(false);
					if (!thisViewer.useCanvas) { Z.Utils.clearDisplay(wD, thisViewer); }
					if (hotspots && hotspots.length > 39) { thisViewport.setHotspotsVisibility(false); }
					zapTimer = window.setTimeout(zoomAndPanContinuousStep, zapStepDuration);
				}
			} else {
				zoomAndPanContinuousStop();
				updateView();
				thisViewport.toggleWatermarks(true);
				if (hotspots && hotspots.length > 39) { thisViewport.setHotspotsVisibility(true); }
			}
		}

		function zoomAndPanContinuousStep () {
			if (zapTimer) {
				// If interval, pan, zoom values not cleared, pan and/or zoom one step.
				if (panX != 0 || panY != 0 || zoomVal != 0) {
					if (!thisViewer.tracking || zoomVal != 0) {
						zoomAndPan(panX, panY, zoomVal);
						// If pan and zoom variables have not been cleared, recall timer.
						zapTimer = window.setTimeout(zoomAndPanContinuousStep, zapStepDuration);
					} else {
						thisViewport.zoomAndPanToView(getX() + panX, getY() + panY);
					}
				}
			}
		}

		function zoomAndPan (stepX, stepY, stepZ) {
			// Pan constraint is applied separately to direct pan and to the indirect pan that
			// occurs when zooming out if image off-center. This enables prevention rather
			// than correction of dissallowed pan and avoids jitter at boundary conditions.
			var viewPanned = false, syncSlider = false, syncNav = false;
			var constrainedZ = getZoom();

			if (stepZ != 0) {
				// Calculate change to scale of tier.  For zoom buttons and keys, meter progress by
				// increasing weight of each step as tier scale grows and decreasing as scale shrinks.
				var targetScale = tierScale *  (1 + stepZ);

				// Calculate target zoom for current step based on target scale for current step.
				var targetZoom = convertTierScaleToZoom(tierCurrent, targetScale);

				// Constrain target zoom.
				constrainedZ = constrainZoom(targetZoom);
				if (constrainedZ != thisViewer.imageZ) {
					// Scale the viewport display to implement zoom step.
					syncSlider = syncNav = scaleTierToZoom(constrainedZ);
				}
			}

			if (stepX != 0 || stepY != 0) {
				// Calculate new container position.
				var targetL = parseFloat(cS.left) + stepX;
				var targetT = parseFloat(cS.top) + stepY;

				// Calculate constrained new position and set viewport display to new position.
				var constrainedPt = constrainPan(targetL, targetT, constrainedZ, thisViewer.imageR, 'container');

				// DEV NOTE: Rounding addresses Firefox bug that causes assignment of zero value to fail when scrolling up from
				// bottom and value of cS.top to stop incrementing at -50 rather than increasing to appropriate positive constraint.
				cS.left = Math.round(constrainedPt.x) + 'px';
				cS.top = Math.round(constrainedPt.y) + 'px';

				viewPanned = true;
				syncNav = true;

				var deltaX = constrainedPt.x - displayL;
				var deltaY = constrainedPt.y - displayT;
				if (oD && tierBackfillDynamic && (Z.mobileDevice || (Math.abs(deltaX) > (viewW / 2) || Math.abs(deltaY) > (viewH / 2)))) {
					redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
				}
			}

			// Sync watermarks, hotspots, zoom slider, navigator, ruler, image set slider on every iteration of zoom function
			// unless number of hotspots is large, then skip every other step. Tradeoff is smooth zoom vs smooth scaling of hotspots.
			var hotspotsSkip = (hotspots && hotspots.length > 30);
			if (!hotspotsSkip) {
				syncViewportRelated();
			} else if (zapStepCount % 2 == 0) {
				syncViewportRelated();
			}
			zapStepCount++;

			// Load new tiles as needed during panning (not zooming).
			/* DEV NOTE: Updating tiles while panning disabled. Requires optimization.
			if (viewPanned) {
				var canvasScale = (thisViewer.useCanvas) ? (parseFloat(vS.width) / vD.width) : 1;
				var maxDim = Math.max(TILE_WIDTH, TILE_HEIGHT);
				var loadThreshold = Math.round(maxDim / panStepDistance * tierScale * canvasScale);
				var loadStep = (zapStepCount % loadThreshold == 0 && zapStepCount != 0);
				if (loadStep) { updateViewWhilePanning(stepX, stepY); }
			}*/
		}

		// Transition smoothly to new view. Image coordinates input, converted to viewport coordinates,
		// then zoom and pan, then updateView to convert changes back to image coordinates.
		this.zoomAndPanToView = function (targetX, targetY, targetZ, targetR, duration, steps, callback, override) {

			//First stop any zoom or pan in progress.
			thisViewport.zoomAndPanAllStop();

			// Second, if block enabled to prevent conflict with hotspot click-link, do not implement new zoom-and-pan effect and clear block.
			if (thisViewer.clickZoomAndPanBlock && (typeof override === 'undefined' || override === null || !override)) {
				thisViewer.clickZoomAndPanBlock = false;
				return;
			}

			// Optional parameters override defaults, if set.
			if (typeof targetX === 'undefined' || targetX === null) { targetX = thisViewer.imageX; }
			if (typeof targetY === 'undefined' || targetY === null) { targetY = thisViewer.imageY; }
			if (typeof targetZ === 'undefined' || targetZ === null) { targetZ = thisViewer.imageZ; }
			if (typeof targetR === 'undefined' || targetR === null) { targetR = thisViewer.imageR; }
			if (typeof duration === 'undefined' || duration === null) { duration = zaptvDuration; }
			if (typeof steps === 'undefined' || steps === null) { steps = zaptvSteps; }

			// Calculate special values.
			if (targetX == 'center' || isNaN(parseFloat(targetX))) { targetX = thisViewer.imageCtrX; }
			if (targetY == 'center' || isNaN(parseFloat(targetY))) { targetY = thisViewer.imageCtrY; }
			if (targetZ == -1 || isNaN(parseFloat(targetZ))) { targetZ = thisViewer.fitZ; }

			// Next, clear watermarks and hotspots for fast, smooth zoom.
			thisViewport.toggleWatermarks(false);
			if (!thisViewer.useCanvas) { Z.Utils.clearDisplay(wD, thisViewer); }
			if (hotspots && hotspots.length > 39) { thisViewport.setHotspotsVisibility(false); }

			// If X or Y values are null, assign initial value (typically center point).
			if (typeof targetX === 'undefined' || targetX === null) { targetX = thisViewer.initialX; }
			if (typeof targetY === 'undefined' || targetY === null) { targetY = thisViewer.initialY; }
			if (typeof targetR === 'undefined' || targetR === null) { targetR = thisViewer.imageR; } // Note: current R not initial R. Permits standard use without R parameter.

			// Validate zoom value.
			if (typeof targetZ === 'undefined' || targetZ === null) { // Define target zoom if not provided.
				targetZ = thisViewer.initialZ;
			} else if (targetZ > 100) { // Convert to decimal range.
				targetZ /= 100;
			} else if (targetZ > thisViewer.maxZ) { // Constrain to max zoom.
				targetZ = thisViewer.maxZ;
			} else if (targetZ < thisViewer.maxZ && targetZ > thisViewer.maxZ - 0.01) { // Force exact arrival at max zoom.
				targetZ = thisViewer.maxZ;
			}

			// Constrain target coordinates.
			var constrainedTargetPoint = constrainPan(targetX, targetY, targetZ, targetR, 'image');
			targetX = constrainedTargetPoint.x;
			targetY = constrainedTargetPoint.y;
			targetZ = constrainZoom(targetZ);

			// Implement zoom and pan to view, if pan is needed or zoom is needed and it is not outside min and max constraints.
			if (Math.round(targetX) != Math.round(thisViewer.imageX) || Math.round(targetY) != Math.round(thisViewer.imageY) || Math.round(targetZ * 100000) != Math.round(thisViewer.imageZ * 100000) || Math.round(targetR) != Math.round(thisViewer.imageR)) {
				// Disable interactivity if steps include rotation to avoid stopping between 90 degree increments.
				thisViewer.interactive = false;

				// Set step counter.
				zaptvStepCurrent = 0;

				// Debug option: add horizontal and vertical lines ('cross hairs') to verify
				// end point accuracy. Can also be set using HTML parameter zCrosshairsVisible=1.
				//thisViewer.drawCrosshairs(thisViewer.ViewerDisplay, viewW, viewH);

				// Set global zaptv instance ID for stepping function to compare prior to creating each step's timer.
				thisViewer.zoomAndPanInProgressID = targetX.toString() + '-' + targetY.toString() + '-' + targetZ.toString() + '-' + targetR.toString();

				// Begin steps toward target coordinates.
				zoomAndPanToViewStep(targetX, targetY, targetZ, targetR, duration, steps, callback);
			}
		}

		function zoomAndPanToViewStep (tX, tY, tZ, tR, duration, steps, callback) {
			// If global zaptv instance ID does not match ID of this step then this iteration thread has been superceded, end it.
			if (thisViewer.zoomAndPanInProgressID != tX.toString() + '-' + tY.toString() + '-' + tZ.toString() + '-' + tR.toString()) {
				return;
			}			

			// Increment step counter and calculate time values.
			zaptvStepCurrent++;
			var stepDuration = duration / steps;
			var currentStepTime = zaptvStepCurrent * stepDuration;

			// Calculate eased step values.
			var newX = Z.Utils.easing(thisViewer.imageX, tX, currentStepTime, duration, thisViewer.smoothZoomEasing, thisViewer.smoothZoomEasing, thisViewer.smoothZoom);
			var newY = Z.Utils.easing(thisViewer.imageY, tY, currentStepTime, duration, thisViewer.smoothZoomEasing, thisViewer.smoothZoomEasing, thisViewer.smoothZoom);
			var newZ = Z.Utils.easing(thisViewer.imageZ, tZ, currentStepTime, duration, thisViewer.smoothZoomEasing, thisViewer.smoothZoomEasing, thisViewer.smoothZoom);
			var newR = Z.Utils.easing(thisViewer.imageR, tR, currentStepTime, duration, thisViewer.smoothZoomEasing, thisViewer.smoothZoomEasing, thisViewer.smoothZoom);

			// DEV NOTE: Additional option: adjust pan for zoom. When zooming in, all points move
			// away from center which magnifies pan toward points to right and/or below center and
			// minifies pan toward points to left and above center. Zooming out creates opposite
			// effect. Current implementation mitigates this impact partially and adequately.

			// Convert step image pixel values to viewport values.
			var newPt = convertImageCoordsToViewportEdgeCoords(newX, newY, newZ);
			var newL = newPt.x;
			var newT = newPt.y;

			// Apply new x, y, z, r values and set components to sync.
			var syncSlider = false, syncNav = syncOversize = false;
			if (parseFloat(cS.left) != newL || parseFloat(cS.top) != newT) {
				cS.left = newL + 'px';
				cS.top = newT + 'px';
				syncNav = true;
				if (oD && tierBackfillDynamic) {
					syncOversize = true;
				}
			}
			if (newZ != thisViewer.imageZ) {
				scaleTierToZoom(newZ, false);
				syncSlider = syncNav = true;
				if (oD && tierBackfillDynamic) {
					oCtx.restore();
					oCtx.save();
					oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
					syncOversize = true;
				}
			}
			if (newR != thisViewer.imageR) {
				Z.Utils.rotateElement(cS, newR, thisViewer.imageR);
				if (oD && tierBackfillDynamic) {
					var deltaR = newR - thisViewer.imageR;
					oCtx.rotate(deltaR * Math.PI / 180);
					syncOversize = true;
				}
				thisViewer.imageR = newR;
				syncNav = true;
			}

			// Redraw oversizeDisplay if sync required. Pan, zoom, and rotation set above.
			if (syncOversize) {
				redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
			}

			// Sync related displays every step if visible to ensure smoothly synchronized scaling. Passing
			// no value defaults to sync'ing within sync function. Watermarks hidden during zooming by
			// default. Toolbar slider, navigator, and ruler sync every other step if visible and update required.
			var syncHotspots = (hotspots && hotspots.length < 40);
			syncViewportRelated(false, syncHotspots, false, false, false);
			if (zaptvStepCurrent % 2 == 0) {
				syncViewportRelated(false, false, syncSlider, syncNav, syncSlider);
			}

			var blockSteps = (thisViewer.tour && thisViewer.tourStopping && Math.round(thisViewer.imageR % 90) == 0)

			// Take additional step toward target or finalize view, depending on step counter.
			if (zaptvStepCurrent < steps+1 && !blockSteps) {
				zaptvTimer = window.setTimeout( function () { zoomAndPanToViewStep(tX, tY, tZ, tR, duration, steps, callback); }, stepDuration);

			} else {
				// Update view and reset watermarks to visible if present.
				if (blockSteps) { thisViewer.tourPlaying = false; }
				thisViewer.interactive = true;
				zoomAndPanToViewStop();
				updateView();
				thisViewport.toggleWatermarks(true);
				if (hotspots && hotspots.length > 39) { thisViewport.setHotspotsVisibility(true); }
				if (typeof callback === 'function') { callback(); }
			}
		}

		this.zoomAndPanAllStop = function (override, overridePlaying) {
			if (thisViewer.interactive) {
				if (thisViewer.zoomAndPanInProgressID !== null || zaptvTimer) {
					zoomAndPanToViewStop();
				}
				if (thisViewer.tourPlaying && overridePlaying) {
					thisViewport.tourStop();
					override = false;
				}
				if (thisViewer.slideshowPlaying && overridePlaying) {
					thisViewport.slideshowStop();
					override = false;
				}
				if (thisViewer.smoothPan && smoothPanInterval !== null) {
					if (!thisViewer.mouseIsDown) { smoothPanStop(true); }
					override = true;
				}
				if (!override) { updateView(); }
			}
		}

		function zoomAndPanContinuousStop () {
			panX = 0;
			panY = 0;
			zoomVal = 0;
			zapStepCount = 0;
			if (zapTimer) {
				window.clearTimeout(zapTimer);
				zapTimer = null;
			}
		}

		// Call when completing zoomAndPanToView steps, when interrupting them, and when
		// beginning user interaction that would conflict with continued zoom and pan steps.
		function zoomAndPanToViewStop () {
			if (thisViewer.zoomAndPanInProgressID !== null || zaptvTimer) {
				thisViewer.zoomAndPanInProgressID = null;
				zaptvStepCurrent = zaptvSteps;
				window.clearTimeout(zaptvTimer);
				zaptvTimer = null;
			}
		}

		// Sync related displays and components.
		this.syncViewportRelated = function (syncWatermarks, syncHotspots, syncSlider, syncNav, syncRuler, syncImageSetSlider, syncComparisonVP, syncOverlayVPs, syncBookmarksURL, syncTracking) {
			syncViewportRelated(syncWatermarks, syncHotspots, syncSlider, syncNav, syncRuler, syncImageSetSlider, syncComparisonVP, syncOverlayVPs, syncBookmarksURL, syncTracking);
		}
		
		function syncViewportRelated (syncWatermarks, syncHotspots, syncSlider, syncNav, syncRuler, syncImageSetSlider, syncComparisonVP, syncOverlayVPs, syncBookmarksURL, syncTracking) {
			if (thisViewer.Toolbar && thisViewer.sliderZoomVisible && (typeof syncSlider === 'undefined' || syncSlider === null || syncSlider)) { syncToolbarSliderToViewport(); }
			if (thisViewer.Navigator && thisViewer.navigatorVisible && (typeof syncNav === 'undefined' || syncNav === null || syncNav))  { syncNavigatorToViewport(); }
			validateCallback('viewChanging');
		}

		this.scaleTierToZoom = function (imageZ, syncOversize) {
			var sync = scaleTierToZoom(imageZ, syncOversize);
			if (sync) { syncViewportRelated(); }
		}

		function scaleTierToZoom (imageZ, syncOversize) {
			// Main function implementing zoom through current tier scaling.  Used by zoomAndPan
			// function of zoom buttons and keys, sliderSlide and sliderSnap functions of slider, and
			// zoomAndPanToView function of Reset key and mouse-click and alt-click zoom features.
			// Note that it uses CSS scaling in canvas contexts and image element scaling otherwise.

			// Track whether function has scaled values so other components will be updated.
			var sync = false;

			// Calculate target tier scale from zoom input value.
			var targetTierScale = convertZoomToTierScale(tierCurrent, imageZ);

			// If input zoom requires a change in scale, continue.
			if (targetTierScale != tierScale) {

				// Update tracking variables.
				tierScale = targetTierScale;

				// Calculate scale adjusting for current scale previously applied to canvas or tiles.
				var scaleDelta = targetTierScale / tierScalePrior;

				// Calculate new size and position - X and Y from panning are applied when drawing tiles or, for backfill, below.
				var newW = displayW * scaleDelta;
				var newH = displayH * scaleDelta;
				var newL = (displayW - newW) / 2;
				var newT = (displayH - newH) / 2;

				// Constrain pan during zoom-out.
				if (targetTierScale < tierScalePrior) {
					var constrainedPt = constrainPan(parseFloat(cS.left), parseFloat(cS.top), imageZ, thisViewer.imageR, 'container');
					cS.left = constrainedPt.x + 'px';
					cS.top = constrainedPt.y + 'px';
				}

				// Apply new scale to displays.
				if (thisViewer.useCanvas) {
					// Redraw viewport display using CSS scaling.
					vS.width = newW + 'px';
					vS.height = newH + 'px';
					vS.left = newL + 'px';
					vS.top = newT + 'px';

					// Sync mask display.
					if (mC) {
						mS.width = newW + 'px';
						mS.height = newH + 'px';
						mS.left = newL + 'px';
						mS.top = newT + 'px';
					}

					// Sync drawing display.
					if (dD) {
						dS.width = newW + 'px';
						dS.height = newH + 'px';
						dS.left = newL + 'px';
						dS.top = newT + 'px';
					}

					// Sync editing display.
					if (eD) {
						eS.width = newW + 'px';
						eS.height = newH + 'px';
						eS.left = newL + 'px';
						eS.top = newT + 'px';
					}

					// Sync backfill display and oversize backfill display, if present. Backfill display assigned different size and position because backfill is sized
					// to content not viewport, to support Navigator panning. Dynamic backfill used where image size prevent caching of a tier of sufficient quality
					// (three tiers less than current tier).  Oversize display used whenever dynamic backfill is used, to provide fast backfill for rapid zoom or pan
					// using tiles from always precached third tier. Oversize implementation conditional on scale threshold of 10,000 pixels width or height, through
					// actual scaling limit of browser are approximately 10,000, 100,000, and 1M for Chrome, Firefox, and IE/Safari respectively.
					tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, getZoom());
					var override = (tierBackfillOversizeScale > 8); // Slider snap or mousewheel can create need for oversize backfill before selectTier resets tierBackfillDynamic = true.
					if (tierBackfillDynamic || override) {

						// Update oversize backfill if conditions apply. Variable syncOversize avoids duplicate redisplays of oversize backfill. Set false by calls from zoomAndPan,
						// zoomAndPanToViewStep (and indirectly, Reset), and set true or unset by sliderSnap, sliderSlide, and handlers for mousewheel, and gestures.
						if (oCtx !== null && typeof syncOversize === 'undefined' || syncOversize === null || syncOversize && oD && (thisViewer.zooming != 'in' || (newW > Z.scaleThreshold || newH > Z.scaleThreshold))) {
							oCtx.restore();
							oCtx.save();
							oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
							oCtx.rotate(thisViewer.imageR * Math.PI / 180);
							redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
						}

						var targetBackfillTierScale = convertZoomToTierScale(tierBackfill, imageZ);
						tierBackfillScale = targetBackfillTierScale;
						var scaleBackfillDelta = targetBackfillTierScale / tierBackfillScalePrior;
						var newBackfillW = backfillW * scaleBackfillDelta;
						var newBackfillH = backfillH * scaleBackfillDelta;
						var newBackfillL = backfillL + ((backfillW - newBackfillW) / 2);
						var newBackfillT = backfillT + ((backfillH - newBackfillH) / 2);
						bS.width = newBackfillW + 'px';
						bS.height = newBackfillH + 'px';
						bS.left = newBackfillL + 'px';
						bS.top = newBackfillT + 'px';

					} else {
						if (oD) { Z.Utils.clearDisplay(oD, thisViewer); } // If use slider to zoom-in then zoom-out without stopping to update view, must clear oversize backfill, if present, or it will show in borders.

						newW = backfillW * scaleDelta;
						newH = backfillH * scaleDelta;
						newL = backfillL + ((thisViewer.imageX  * (1 - scaleDelta)) * thisViewer.imageZ);
						newT = backfillT + ((thisViewer.imageY * (1 - scaleDelta)) * thisViewer.imageZ);
						bS.width = newW + 'px';
						bS.height = newH + 'px';
						bS.left = newL + 'px';
						bS.top = newT + 'px';
					}

				} else {
					// In non-canvas context, scaling of each tile image is required.
					redisplayCachedTiles(vD, tierCurrent, tilesCached, 'centerOut', false, 'Scaling: non-canvas zoom');

					if (tierBackfillDynamic) {
						var buffer = BACKFILL_BUFFER;
						backfillW = displayW * buffer;
						backfillH = displayH * buffer;
						backfillL = -(displayW / buffer);
						backfillT = -(displayH / buffer);
						backfillCtrX = displayCtrX * buffer;
						backfillCtrY = displayCtrY * buffer;
						bD.width = backfillW;
						bD.height = backfillH;
						bS.width = bD.width + 'px';
						bS.height = bD.height + 'px';
						bS.left = backfillL + 'px';
						bS.top = backfillT + 'px';
					} else {
						var tierBackfillW = tierWs[tierBackfill];
						var tierBackfillH = tierHs[tierBackfill];
						bD.width = tierBackfillW;
						bD.height = tierBackfillH;
						var deltaX = thisViewer.imageX * imageZ;
						var deltaY = thisViewer.imageY * imageZ;
						backfillL = (displayCtrX - deltaX);
						backfillT = (displayCtrY - deltaY);
						bS.left = backfillL + 'px';
						bS.top = backfillT + 'px';
					}

					// And scaling of each tile is also required for backfill display.
					redisplayCachedTiles(bD, tierBackfill, tilesBackfillCached, 'simple', false, 'Scaling: non-canvas zoom - backfill');
				}
				sync = true;
			}
			return sync;
		}

		this.reset = function (prior) {
			if (thisViewer.maskingSelection && thisViewer.maskClearOnUserAction) { thisViewport.clearMask(); }
			if (!prior) {
				thisViewport.zoomAndPanToView(thisViewer.initialX, thisViewer.initialY, thisViewer.initialZ, thisViewer.initialR);
			} else {
				Z.Utils.setButtonDefaults(buttonReset, thisToolbar);
				thisViewport.zoomAndPanToView(thisViewer.priorX, thisViewer.priorY, thisViewer.priorZ, thisViewer.priorR);
			}
			recordPriorViewCoordinates(true);
		}

		this.labelScale = function (scaleDir) {
			switch(scaleDir) {
				case 'down' :
					if (scaleVal >= 0) { scaleVal -= labelScaleStepDistance; }
					break;
				case 'up' :
					if (scaleVal <= 0) { scaleVal += labelScaleStepDistance; }
					break;
				case 'stop' :
					scaleVal = 0;
					break;
			}
			if (scaleVal != 0) {
				if (!scaleTimer) {
					scaleTimer = window.setTimeout(labelScaleContinuousStep, labelScaleStepDuration);
				}
			} else {
				labelScaleContinuousStop();
			}
		}

		function labelScaleContinuousStep () {
			if (scaleTimer) {
				// If interval, scaleVal values not cleared, scale one step.
				if (scaleVal != 0) {
					var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotCurrentID);
					if (index != -1) {
						var cH = hotspots[index];
						var targetScaleX = cH.xScale *  (1 + scaleVal);
						var targetScaleY = cH.yScale *  (1 + scaleVal);
						thisViewport.modifyHotspot(hotspotCurrentID, 'xScale', targetScaleX, true, true);
						thisViewport.modifyHotspot(hotspotCurrentID, 'yScale', targetScaleY, false, true);				;

						// If scaleVal variable has not been cleared, recall timer.
						scaleTimer = window.setTimeout(labelScaleContinuousStep, labelScaleStepDuration);
					}
				}
			}
		}

		function labelScaleContinuousStop () {
			if (scaleTimer) {
				window.clearTimeout(scaleTimer);
				scaleTimer = null;
			}
			scaleVal = 0;
		}

		this.toggleWatermarks = function (override) {
			if (wS) {
				var showing = (wS.display == 'inline-block');
				var show = (typeof override !== 'undefined' && override !== null) ? override : !showing;
				wS.display = (show) ? 'inline-block' : 'none';
			}
		}

		this.toggleConstrainPan = function (override) {
			thisViewer.constrainPan = (typeof override !== 'undefined' && override !== null) ? override : !thisViewer.constrainPan;
			if (thisViewer.constrainPan) {
				var x = parseFloat(vS.left);
				var y = parseFloat(vS.top);
				var constrainedPt = constrainPan(x, y, thisViewer.imageZ, thisViewer.imageR, 'container');
				cS.left = constrainedPt.x + 'px';
				cS.top = constrainedPt.y + 'px';
				updateView();
			}
		}

		this.toggleSmoothPan = function () {
			smoothPanStop();
			thisViewer.smoothPan = !thisViewer.smoothPan;
		}

		this.toggleSmoothZoom = function () {
			zoomAndPanToViewStop();
			thisViewer.smoothZoom = !thisViewer.smoothZoom;
		}

		this.buttonToggleBackfillHandler = function () {
			thisViewport.toggleBackfill();
		}

		this.toggleBackfill = function (override) {
			var bD = Z.Utils.getElementOfViewerById(zvIntID, 'viewportBackfillDisplay' + viewportID.toString());
			if (bD) {
				var bS = bD.style;
				var visibilityCurrent = (bS.display == 'inline-block');
				var visibility = (typeof override !== 'undefined' && override !== null) ? override : !visibilityCurrent;
				bS.display = (visibility) ? 'inline-block' : 'none';
			}
		}

		this.buttonToggleDisplayHandler = function () {
			thisViewport.toggleDisplay();
		}

		this.toggleDisplay = function (override) {
			var vD = Z.Utils.getElementOfViewerById(zvIntID, 'viewportDisplay' + viewportID.toString());
			if (vD) {
				vS = vD.style;
				var visibilityCurrent = (vS.display == 'inline-block');
				var visibility = (typeof override !== 'undefined' && override !== null) ? override : !visibilityCurrent;
				vS.display = (visibility) ? 'inline-block' : 'none';
			}
		}

		this.toggleDisplaysOther = function (value) {
			var displayVal = (value) ? 'inline-block' : 'none';
			if (oS) { oS.display = displayVal; }
			if (bS) { bS.display = displayVal; }
			if (tS) { tS.display = displayVal; }
			if (fbS) { fbS.display = displayVal; }
			if (wS) { wS.display = displayVal; }
			if (dS) { dS.display = displayVal; }
			if (eS) { eS.display = displayVal; }
			if (hS) { hS.display = displayVal; }
			if (sS) { sS.display = displayVal; }
		}


		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//::::::::::: ZOOM RECTANGLE, FULL VIEW, ROTATION, & MEASURE FUNCTIONS :::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		this.zoomAndPanToZoomRectangle = function (zRectPts) {
			//Get rect height and width and center x and y.
			var left = Math.min(zRectPts[0].x, zRectPts[1].x, zRectPts[2].x, zRectPts[3].x)
			var right = Math.max(zRectPts[0].x, zRectPts[1].x, zRectPts[2].x, zRectPts[3].x)
			var top = Math.min(zRectPts[0].y, zRectPts[1].y, zRectPts[2].y, zRectPts[3].y)
			var bottom = Math.max(zRectPts[0].y, zRectPts[1].y, zRectPts[2].y, zRectPts[3].y)
			var w = right - left;
			var h = bottom - top;
			var centerX = left + w / 2;
			var centerY = top + h / 2;
			var currentR = thisViewport.getRotation();
			var zRectZ = thisViewport.calculateZoomToFit(w, h, currentR);
			
			// Alternative implementation: Compare narrower rectangle dimension to display rather than wider.
			//var zRectZ = thisViewport.calculateZoomToFill(w, h, currentR);

			thisViewport.zoomAndPanToView(centerX, centerY, zRectZ);
		}

		this.toggleFullViewModeExternal = function () {
			// Assumes call from external toolbar and internal toolbar hidden. Sets tracking variable to cause display
			// Exit button over viewport in full screen mode when external toolbar is hidden under viewport.
			buttonFullViewExitExternalVisible = true;
			thisViewport.toggleFullViewMode();
		}

		this.toggleFullViewMode = function (override, escaped) {
			// DEV NOTE: Testing interaction between mode change and zoom-and-pan in progress.
			//thisViewport.zoomAndPanAllStop();

			if (thisViewer.maskingSelection && thisViewer.maskClearOnUserAction) { thisViewport.clearMask(); }

			// Hide toolbar if visible.
			if (thisViewer.ToolbarDisplay && thisViewer.Toolbar) { thisViewer.Toolbar.show(false); }

			var width = null;
			var height = null;

			// If override is false (called by Escape key) set false, otherwise, set to opposite of current state.
			thisViewer.fullViewPrior = thisViewer.fullView;
			thisViewer.fullView = (typeof override !== 'undefined' && override !== null) ? override : !thisViewer.fullView;

			// Declare and set document references.
			var fvB = document.body;
			var fvbS = fvB.style;
			var fvdS = document.documentElement.style;
			var fvvS = thisViewer.ViewerDisplay.style;
			var fvcS = Z.Utils.getElementStyle(thisViewer.pageContainer);
			var dimensions;

			if (thisViewer.fullView) {
				// Record non-full-page values.
				var containerDims = Z.Utils.getContainerSize(thisViewer.pageContainer, thisViewer.ViewerDisplay);

				fvBodW = containerDims.x;
				fvBodH = containerDims.y;
				fvBodO = fvbS.overflow;
				fvDocO = fvdS.overflow;
				fvContBC = (Z.Utils.stringValidate(fvcS.backgroundColor) && fvcS.backgroundColor != 'transparent') ? fvcS.backgroundColor : (Z.Utils.stringValidate(fvbS.backgroundColor) && fvbS.backgroundColor != 'transparent') ? fvbS.backgroundColor : Z.Utils.getResource('DEFAULT_FULLVIEWBACKCOLOR');
				fvContPos = fvvS.position;
				fvContIdx = fvvS.zIndex;

				// Implement full screen or full page view.
				if (Z.fullScreenSupported && !thisViewer.fullPageVisible) {
					dimensions = Z.Utils.getScreenSize();
					thisViewer.fullScreenEntering = true; // Subverts change event on mode entry.
					Z.Utils.fullScreenView(thisViewer.ViewerDisplay, true, null, thisViewport);
					validateCallback('fullscreenEntered');

				} else {
					dimensions = Z.Utils.getWindowSize();
					if (!Z.mobileDevice) {
						fvbS.width = '100%';
						fvbS.height = '100%';
					} else {
						fvbS.width = dimensions.x;
						fvbS.height = dimensions.y;
					}
					validateCallback('fullpageEntered');
				}

				width = dimensions.x;
				height = dimensions.y;

				// Update related settings.
				fvbS.overflow = 'hidden';
				fvdS.overflow = 'hidden';
				fvvS.backgroundColor = fvContBC;
				fvvS.position = 'fixed';
				fvvS.zIndex = '99999999';

				// Temporarily disable auto-resizing to prevent conflict with full view mode change.
				if (thisViewer.autoResize) { Z.Utils.removeEventListener(window, 'resize', thisViewer.viewerEventsHandler); }

			} else {
				// Reset related settings.
				fvbS.overflow = fvBodO;
				fvdS.overflow = fvDocO;
				fvvS.backgroundColor = fvContBC;
				fvvS.position = 'relative';
				fvvS.zIndex = fvContIdx;

				// Unimplement full screen or full page view.
				if (Z.fullScreenSupported && !thisViewer.fullPageVisible) {
					Z.Utils.fullScreenView(thisViewer.ViewerDisplay, false, escaped, thisViewport);
					validateCallback('fullscreenExited');
				} else {
					validateCallback('fullpageExited');
				}

				fvbS.width = fvBodW;
				fvbS.height = fvBodH;
				width = fvBodW;
				height = fvBodH;
				if (isNaN(width)) { width = thisViewer.ViewerDisplay.clientWidth; }
				if (isNaN(height)) { height = thisViewer.ViewerDisplay.clientHeight; }

				// Hide exit button in case visible due to external full view call.
				buttonFullViewExitExternalVisible = false;

				// Reenable auto-resizing disabled above to prevent conflict with full view mode change.
				if (thisViewer.autoResize) { Z.Utils.addEventListener(window, 'resize', thisViewer.viewerEventsHandler); }
			}

			// If page container is sized with pixel values rather than percentages or ‘vw’ and ‘vh’ auto-resizing will occur and resize must be called.
			if (thisViewer.initialFullPage) { thisViewport.setSizeAndPosition(width, height); }

			var newZoom = thisViewer.viewportCurrent.calculateZoomForResize(thisViewer.viewportCurrent.getZoom(), thisViewer.viewerW, thisViewer.viewerH, width, height);
			thisViewer.resizeViewer(width, height, newZoom);

			var vpComparison = null;		
			if (thisViewer.comparison) {
				vpComparison = (thisViewport.getViewportID() == 0) ? thisViewer.Viewport1 : thisViewer.Viewport0;
				if (vpComparison) { vpComparison.syncViewportResize(thisViewer.imageX, thisViewer.imageY, thisViewer.imageZ, thisViewer.imageR); }
			} else if (thisViewer.overlays) {
				for (var i = 0, j = thisViewer.imageSetLength - 1; i < j; i++) {
					// -1 in line above prevents top VP from resetting itself in loop.
					thisViewer['Viewport' + i.toString()].syncViewportResize(thisViewer.imageX, thisViewer.imageY, thisViewer.imageZ, thisViewer.imageR);
				}
			}
			if (thisViewer.imageList && getStatus('initializedImageList')) {
				thisViewport.setSizeAndPositionImageList();
				if (vpComparison && vpComparison.getStatus('initializedImageList')) { 
					vpComparison.setSizeAndPositionImageList();
				}
			}

			// Set full view or full view exit button visible based on full view status. If using external toolbar in page, display external exit button over viewport.
			showButtonFullViewExitInternal(thisViewer.fullView);
			showButtonFullViewExitExternal(buttonFullViewExitExternalVisible);

			// Clear variable ensuring updateView on exit of full page view.
			thisViewer.fullViewPrior = false;
		}

		function showButtonFullViewExitInternal (value) {
			var bFV = Z.Utils.getElementOfViewerById(zvIntID, 'buttonFullView');
			var bFVE = Z.Utils.getElementOfViewerById(zvIntID, 'buttonFullViewExit');
			if (bFV && bFVE) {
				bFV.style.display = (value) ? 'none' : 'inline-block';
				bFVE.style.display = (value) ? 'inline-block' : 'none';
			}
		}

		function showButtonFullViewExitExternal (value) {
			if (value) {
				if (!buttonFullViewExitExternal) { configureButtonFullViewExitExternal(); }
				buttonFullViewExitExternal.elmt.style.display = 'inline-block';
			} else {
				if (buttonFullViewExitExternal) { buttonFullViewExitExternal.elmt.style.display = 'none'; }
			}
		}

		function configureButtonFullViewExitExternal () {
			var btnTxt = Z.Utils.getResource('UI_FVCANCELBUTTONTEXT');
			var btnW = 34;
			var btnH = 34;
			var btnMargin = 20;
			var btnL = parseFloat(thisViewer.viewerW) - (btnW + btnMargin);
			var btnT = parseFloat(thisViewer.viewerH) - (btnH + btnMargin);
			var btnColor = Z.Utils.getResource('DEFAULT_FULLVIEWEXITEXTERNALBUTTONCOLOR');
			buttonFullViewExitExternal = new Z.Utils.Button(zvIntID, 'buttonFullViewExitExternal', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', buttonFullViewExitExternalHandler, 'TIP_TOGGLEFULLVIEWEXITEXTERNAL', 'solid', '1px', btnColor, '0px', '0px', null, null, thisViewer.tooltipsVisible);
			thisViewer.ViewerDisplay.appendChild(buttonFullViewExitExternal.elmt);
		}

		function buttonFullViewExitExternalHandler () {
			thisViewport.toggleFullViewMode(false);
		}

		this.rotate = function (rotationDir, isAltKey) {
			// Record prior X, Y, Z, and R values.
			recordPriorViewCoordinates();

			if (!thisViewer.rotationFree || isAltKey) {
				if (thisViewer.imageR % 90 != 0) { thisViewer.imageR = Math.round(thisViewer.imageR / 90) * 90; }
				var degDelta = (rotationDir == 'clockwise') ? 90 : -90;
				thisViewport.rotateStep(degDelta, true);

			} else {
				if (rotationDir == 'stop' && thisViewer.rotating == 'stop') { return; }
				rotVal = (rotationDir == 'stop') ? 0 : (rotationDir == 'clockwise') ? rotStepDegrees : -rotStepDegrees;
				thisViewer.rotating = (rotVal == 0) ? 'stop' : ((rotVal > 0) ? 'clockwise' : 'counterwise');
				if (rotVal !=0) {
					if (!rotTimer) {
						rotTimer = window.setTimeout(rotateContinuousStep, rotStepDuration);
					}
				} else {
					rotateContinuousStop();
					updateView();
				}
			}
		}

		function rotateContinuousStep () {
			if (rotTimer) {
				// If interval and rotation values not cleared, rotate one step.
				if (rotVal != 0) {
					thisViewport.rotateStep(rotVal, false);
					// If rotation variable has not been cleared, recall timer.
					rotTimer = window.setTimeout(rotateContinuousStep, rotStepDuration);
					var syncHotspots = (hotspots && hotspots.length < 40);
					syncViewportRelated(false, syncHotspots, false, true, false);
				}
			}
		}

		function rotateContinuousStop () {
			rotVal = 0;
			if (rotTimer) {
				window.clearTimeout(rotTimer);
				rotTimer = null;
			}
		}

		this.rotateStep = function (degreesDelta, useZaptv, syncVP) {
			if (!thisViewer.interactive) { return; }
			if (Z.rotationSupported) {
				var rotationValueNew = thisViewer.imageR + degreesDelta;

				if (!thisViewer.rotationFree) {
					thisViewer.interactive = false;
					var rotationValueConstrained = constrainRotation(rotationValueNew);

					// Use zoom and pan function to gradually rotate to new rotation and/or to invoke pan constraint and reset
					// coordinates, if necessary.  Set thisViewer.imageR to constrained value after new unconstrained value implemented
					// to avoid backward 270 rotation when rotating from 270 to 360 (0) or from -270 to -360 (0).
					if (useZaptv) {
						thisViewport.zoomAndPanToView(thisViewer.imageX, thisViewer.imageY, thisViewer.imageZ, rotationValueNew, 600, 12, function () { thisViewer.imageR = rotationValueConstrained; });
					} else if (syncVP) {
						Z.Utils.rotateElement(cS, thisViewer.imageR, thisViewer.imageR, true);
						thisViewer.interactive = true;
					} else {
						Z.Utils.rotateElement(cS, rotationValueNew, thisViewer.imageR);
						if (oD && thisViewer.imageR != 0) {
							var deltaR = rotationValueNew - thisViewer.imageR;
							oCtx.rotate(deltaR * Math.PI / 180);
						}
						thisViewer.imageR = rotationValueConstrained;
						thisViewport.zoomAndPanToView(thisViewer.imageX, thisViewer.imageY, thisViewer.imageZ);
					}

				} else {
					Z.Utils.rotateElement(cS, rotationValueNew, thisViewer.imageR);
					thisViewer.imageR = rotationValueNew;

					// Sync related components.
					syncNavigatorToViewport();

					// Alternative implementation: do not hide backfills, hotspots, watermarks, etc. and sync rotation.
					//var syncHotspots = (hotspots && hotspots.length < 40);
					//syncViewportRelated(false, syncHotspots, false, true, false, false, true, false, false, false);
				}
			} else {
				thisViewer.showMessage(Z.Utils.getResource('ALERT_ROTATIONREQUIRESNEWERBROWSER'));
			}
		}

		this.toggleEditModeMeasure = function (override) {
			thisViewport.zoomAndPanAllStop();
			if (thisViewer.maskingSelection && thisViewer.maskClearOnUserAction) { thisViewport.clearMask(); }

			// If override is false set false, otherwise, set to opposite of current state.
			if (typeof override !== 'undefined' && !override || thisViewer.labelMode == 'measure') {

				// If measuring while not in edit mode be sure to delete any hotspot polygons previously created to display a measurement.
				if (thisViewer.editMode === null && thisViewer.labelMode == 'measure' && hotspots.length > 0) {
					thisViewport.deleteAllMeasureHotspots();
					hotspotCurrentID = null;
				}
				thisViewport.setEditModeLabel('view');

			} else {
				thisViewport.setEditModeLabel('measure');
			}
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::: EVENT FUNCTIONS ::::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		// Handle mouse and touch events that are Viewport-specific. Keyboard events are handled
		// at the level of the Viewer. Disable right-click / control-click / click-hold menu.
		function initializeViewportEventListeners () {
			Z.Utils.addEventListener(cD, 'mousedown', viewportEventsHandler);
			Z.Utils.addEventListener(cD, 'mousemove', Z.Utils.preventDefault);
			Z.Utils.addEventListener(cD, 'touchstart', viewportEventsHandler);
			Z.Utils.addEventListener(cD, 'touchmove', viewportEventsHandler);
			Z.Utils.addEventListener(cD, 'touchend', viewportEventsHandler);
			Z.Utils.addEventListener(cD, 'touchcancel', viewportEventsHandler);
			Z.Utils.addEventListener(cD, 'gesturestart', viewportEventsHandler);
			Z.Utils.addEventListener(cD, 'gesturechange', viewportEventsHandler);
			Z.Utils.addEventListener(cD, 'gestureend', viewportEventsHandler);
			Z.Utils.addEventListener(bD, 'contextmenu', Z.Utils.preventDefault);
			Z.Utils.addEventListener(vD, 'contextmenu', Z.Utils.preventDefault);
			if (wD) { Z.Utils.addEventListener(wD, 'contextmenu', Z.Utils.preventDefault); }
			if (hD) { Z.Utils.addEventListener(hD, 'contextmenu', Z.Utils.preventDefault); }
		}

		function viewportEventsHandler (event) {
			var event = Z.Utils.event(event);
			var eventType = event.type;
			if (event && eventType) {

				// Debug option: use next line to verify touch events properly preventing default simulation of mouse events.
				//if (eventType == 'mouseover' || eventType == 'mousedown' || eventType == 'mouseup' || eventType == 'mouseout') { alert('mouse event: ' + eventType); }

				// Prevent unwanted effects: interactivity or mouse-panning if parameters specify, zoom on right-click,
				// page dragging in touch contexts, and conflicting zoom-and-pan function calls. DEV NOTE: Timeout in
				// next line is placeholder workaround for hotspot graphic and caption anchor failure in IE.
				var openPoly = (!polygonComplete && (thisViewer.labelMode == 'polygon' || thisViewer.labelMode == 'measure'));
				var isRightMouseBtn = Z.Utils.isRightMouseButton(event);
				var isAltKey = event.altKey;
				var blockRightClick = isRightMouseBtn && !openPoly;

				if ((eventType != 'mouseover' && eventType != 'mouseout' && !thisViewer.interactive)
					|| (eventType == 'mousedown' && (!thisViewer.interactive || (thisViewer.coordinatesVisible && isAltKey)))
					|| blockRightClick) {
					thisViewer.tourStop = true; // Prevents autostart if not started or next destination.
					return;
				} else if (eventType == 'mousedown' || eventType == 'touchstart' || (thisViewer.tourPlaying && thisViewer.tourStop)) {
					thisViewport.zoomAndPanAllStop();
					if (thisViewer.tour) { thisViewport.tourStop(); } // Sets thisViewer.tourPlaying = false;
					thisViewer.tourStop = true;
					thisViewer.interactive = true;
				}

				if (thisViewer.touchSupport && !thisViewer.clickZoomAndPanBlock && eventType != 'touchmove' && eventType != 'gesturechange') {
					event.preventDefault();
				}
				if (eventType == 'mousedown') {
					var displayMouseDownTimer = window.setTimeout( function () { thisViewport.zoomAndPanAllStop(false, true); }, 1);
					if (thisViewer.maskingSelection && thisViewer.maskClearOnUserAction) { thisViewport.clearMask(); }

				} else if (eventType == 'touchstart' || eventType == 'gesturestart') {
					// DEV NOTE: Next line is necessary to prevent simulated mouse events which can cause duplicate event such as second function call.
					// However, must not be implemented on standard mouse click of hotspot as will prevent hotspot clickURL effect implemented as anchor href.
					var prevDef = false;
					touch = Z.Utils.getFirstTouch(event);
					if (typeof touch !== 'undefined' && touch !== null) {
						var hotTarget = touch.target;
						var hotspotSelect = getTargetHotspot(hotTarget);
						if (hotspotSelect === null) {
							prevDef = true; // Not clicking hotspot.
						} else {
							var hotID = hotspotSelect.id.substring(3, hotspotSelect.id.length);
							var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotID);
							if (index != -1) {
								var hotspot = hotspots[index];
								if (hotspot !== null && hotspot.clickURL == 'function') {
									prevDef = true; // Click hotspot that has click function.
								}
							}
						}
					}
					if (prevDef) { event.preventDefault(); }

					thisViewport.zoomAndPanAllStop(false, true);
					if (thisViewer.maskingSelection && thisViewer.maskClearOnUserAction) { thisViewport.clearMask(); }
				}

				// Handle event resetting.
				switch(eventType) {
					case 'mouseover' :
						// Prevent page scrolling using arrow keys. Also implemented in text element blur handler.
						if (!thisViewer.fullView && document.activeElement.tagName != 'TEXTAREA') {
							initializeViewerKeyDefaultListeners(true);
						}
						break;
					case 'mousedown' :
						// Ensure mouse interaction with viewport re-enables key interaction by removing focus from any text area and adding key listeners.
						if (!thisViewer.fullView && document.activeElement) { document.activeElement.blur(); }
						initializeViewerKeyEventListeners(true);

						// Note: handler for mouse down event attached to viewport, mouse up attached to viewer.
						Z.Utils.addEventListener(document, 'mousemove', viewportEventsHandler);
						Z.Utils.addEventListener(document, 'mouseup', viewportEventsHandler);
						break;
					case 'mouseup' :
						if (typeof polygonComplete === 'undefined' || polygonComplete) { Z.Utils.removeEventListener(document, 'mousemove', viewportEventsHandler); }
						Z.Utils.removeEventListener(document, 'mouseup', viewportEventsHandler);
						break;
				}

				// Handle event actions.
				viewportEventsManager(event);

				if (eventType == 'mousedown' || eventType == 'mousemove') { return false; }
			}
		}

		function viewportEventsManager (event) {
			var vpIDStr = viewportID.toString();
			if (thisViewer.annotations) { resetAnnotationPanel(); }

			// Get DOM target values. If no gesture support get second touch point for pinch support.				
			var event = Z.Utils.event(event);
			var eventType = event.type;
			var isAltKey = event.altKey;
			if (event && eventType) {

				var target, relatedTarget;
				if (eventType == 'touchstart' || eventType == 'touchmove' || eventType == 'touchend' || eventType == 'touchcancel') {
					touch = Z.Utils.getFirstTouch(event);
					if (touch) {
						target = touch.target;
						mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
					}
					if (!thisViewer.gestureSupport) {
						touch2 = Z.Utils.getSecondTouch(event);
						if (touch2) { mPt2 = new Z.Utils.Point(touch2.pageX, touch2.pageY); }
					}
				} else {
					target = Z.Utils.target(event);
					relatedTarget = Z.Utils.relatedTarget(event);
					var isRightMouseBtn = Z.Utils.isRightMouseButton(event);
					if (eventType != 'resize') { mPt = Z.Utils.getMousePosition(event); }
				}
				if (thisViewer.smoothPan && mPt) { smoothPanMousePt = mPt; }

				// Calculate zoom and click values. If no gesture support get second click point for pinch support.
				var zVal = thisViewport.getZoom();
				var zValStr = (zVal * 100).toString();
				var clickPt = (mPt) ? thisViewport.getClickCoordsInImage(event, zVal, mPt) : null;
				var clickPt2 = (mPt2 && !thisViewer.gestureSupport) ? thisViewport.getClickCoordsInImage(event, zVal, mPt2) : null;

				// Get simplified event type. Supported values: 'start', 'move', 'end', 'gesturestart', 'gesturechange', 'gestureend'.
				zoomifyEvent = getZoomifyEvent(event);

				// Implement actions.
				switch(zoomifyEvent) {

					case 'start' :
						zoomifyAction = getZoomifyAction(target, clickPt, isAltKey); // Supported values: 'navigateImage', 'zoomRectangleImage', 'createLabelSimple', 'createLabelAndControlPoint', 'createControlPoint', 'selectLabel', 'editLabel', 'editControlPoint'.

						dragPtStart = new Z.Utils.Point(mPt.x, mPt.y);
						dragTimeStart = new Date().getTime();	
						thisViewer.mouseIsDown = true;
						thisViewer.altKeyIsDown = isAltKey;	
						var captionPosition = (thisViewer.captionPosition) ? thisViewer.captionPosition : '8';
						wasGesturing = wasPinching = false;

						switch (zoomifyAction) {
							case 'navigateImage' :
								if (thisViewer.smoothPan) {
									smoothPanStart();
								} else {
									cD.mouseXPrior = mPt.x;
									cD.mouseYPrior = mPt.y;
								}
								break;
							case 'zoomRectangleImage' :
								createZoomRectangle(clickPt);
								break;
							case 'createLabelSimple' : // New Field of View, Text, or Counter label.
								if (thisViewer.labelMode == 'fieldofview') {
									thisViewport.createLabelFromParameters(null, null, thisViewer.labelMode, null, null, thisViewer.imageX.toString(), thisViewer.imageY.toString(), zValStr, viewW, viewH, null, null, null, '0', '0', null, null, null, 'FOV', null, null, captionTextColor, null, null, null, null, null, null, null, null, '5', '0', null, null);
								} else if (thisViewer.labelMode == 'counter') {
									thisViewport.createLabelCounter(clickPt);
								} else {
									thisViewport.createLabelFromParameters(null, null, thisViewer.labelMode, null, null, clickPt.x.toString(), clickPt.y.toString(), zValStr, null, null, null, null, null, '0', '0', null, null, null, null, null, null, captionTextColor, null, null, null, null, null, null, null, null, '5', '0', null, null);
								}
								if (thisViewer.labelMode != 'counter') { thisViewport.updateAnnotationPanelForNewLabel(); }
								break;
							case 'createLabelShape' : // New shape: arrow, line, square, rectangle, circle, ellipse, triangle. 
								var shapeList = document.getElementById('labelShapeList' + vpIDStr);
								if (shapeList) {
									thisViewport.createLabelFromParameters(null, null, thisViewer.labelMode, shapeList[shapeList.selectedIndex].value, null, clickPt.x.toString(), clickPt.y.toString(), zValStr, null, null, null, null, null, '0', '0', null, null, null, null, null, null, captionTextColor, null, selectedLineColor, selectedFillColor, null, null, null, null, null, captionPosition, '0', null, null);
									thisViewport.updateAnnotationPanelForNewLabel();
									//DEV NOTE: remove next line and uncomment matching call in 'end' event below when enabling click-drag shape creation.
									updateShapeSize(hotspotCurrentID);								
								}
								break;
							case 'createLabelAndControlPoint' : // New Freehand, Polygon, or Measure label. 
								var polygonPts = createPolygonPoints(clickPt);
								polygonComplete = polygonClosed = false; // If creating polygon in Edit mode, enable bungee drawing by not disabling mousemove event handler.
								if (thisViewer.labelMode == 'freehand') { 
									zoomifyAction = 'createControlPoint'; // Update zoomifyAction for move event here because otherwise only set on start event.
								} else if (thisViewer.editMode === null && thisViewer.labelMode == 'measure' &&  hotspots.length > 0) {
									thisViewport.deleteAllMeasureHotspots(); // If measuring while not in edit mode, be sure to first delete any hotspot polygons previously created to display a measurement.
								}
								thisViewport.createLabelFromParameters(null, null, thisViewer.labelMode, 'polygon', null, clickPt.x.toString(), clickPt.y.toString(), zValStr, null, null, null, null, null, '0', '0', null, null, null, null, null, null, captionTextColor, null, selectedLineColor, null, null, null, null, null, null, captionPosition, '0', null, null, null, null, '0', polygonPts, null, null, null, null, null, '1');
								thisViewport.updateAnnotationPanelForNewLabel();
								break;
							case 'createControlPoint' :  // Add control point to existing Freehand, Polygon, or Measure label.
								createControlPoint(hotspotCurrentID, false, clickPt, true);
								break;
							case 'selectLabel' :
								hotspotDragging = getTargetHotspot(target);
								if (hotspotDragging) { updateCurrentLabel(hotspotDragging.id.substring(3, hotspotDragging.id.length)); }
								break;
							case 'completeLabelPolygon' :
								if (isAltKey) { createControlPoint(hotspotCurrentID, false, clickPt, true); }
							case 'editLabel' :
								hotspotDragging = getTargetHotspot(target);					
								if (hotspotDragging) {
									updateSavePoint(event, clickPt);
									updateLabelPositionInHTML(event, dragPtStart, zoomifyEvent);
									updateCurrentLabel(hotspotDragging.id.substring(3, hotspotDragging.id.length), false);
								}
								break;
							case 'editControlPoint' :
								controlPointCurrent = getTargetControlPoint(clickPt, thisViewer.labelMode);
								break;
						}
						break;

					case 'move' :				
						dragPtCurrent = new Z.Utils.Point(mPt.x, mPt.y);
						var mPtZX = (clickPt.x - thisViewer.imageX) * zVal;
						var mPtZY = (clickPt.y - thisViewer.imageY) * zVal;		

						switch (zoomifyAction) {
							case 'navigateImage' :
								if (smoothPanInterval) {
									smoothPanMousePt = mPt;
								} else {
									directPan(mPt);
								}
								break;
							case 'zoomRectangleImage' :
								updateZoomRectangle(hotspotCurrentID, controlPointCurrent, clickPt);
								break;
							case 'createLabelAndControlPoint' : // Freehand, polygon, or measure label.
								drawPolygonBungeeLine(mPtZX, mPtZY, clickPt);
								break;
							case 'createControlPoint' :
								if (thisViewer.labelMode == 'freehand') {
									if (thisViewer.mouseIsDown) { drawFreehand(lastPtX, lastPtY, mPtZX, mPtZY, clickPt); }
								} else {
									drawPolygonBungeeLine(mPtZX, mPtZY, clickPt);
								}
								break;
							case 'editLabel' :
								updateLabelPositionInHTML(event, mPt, zoomifyEvent);
								updateLabelPositionOnCanvas(event, hotspotDragging, mPt);
								break;
							case 'editControlPoint' :
								updateShapeOrPolygon(hotspotCurrentID, controlPointCurrent, clickPt);
								break;
						}
						break;

					case 'end' :
						thisViewer.mouseIsDown = false;
						switch (zoomifyAction) {
							case 'navigateImage' :
								updateImageNavigation(event, mPt, zVal, isAltKey);
								break;
							case 'zoomRectangleImage' :
								updateImageNavigation(event, mPt, zVal, isAltKey);
								break;
							case 'createLabelSimple' : // New Field of View, Text, or Counter label.
								if (thisViewer.labelMode == 'fieldofview') { thisViewport.setEditModeLabel('view'); }
								break;
							case 'createControlPoint' :
								if (thisViewer.labelMode == 'freehand') {
									thisViewport.setEditModeLabel('freehand'); // Resetting disables mousemove to allow panel interactions function properly. 
									completePolygon(hotspotCurrentID, false);
									lastPtX = lastPtY = null;
								}
								break;
							case 'createLabelShape' : // New shape: arrow, line, square, rectangle, circle, ellipse, triangle. 
								//DEV NOTE: comment-out line above and uncomment line below if implementing click-drag shape creation.
								//updateShapeSize(hotspotCurrentID);
								break;
							case 'completeLabelPolygon' :
								completePolygon(hotspotCurrentID, !isAltKey);
								break;
							case 'editLabel' :								
								updateLabelPositionInHTML(event, mPt, zoomifyEvent);
								break;
							case 'editControlPoint' :
								updateShapeOrPolygon(hotspotCurrentID, controlPointCurrent, clickPt);
								break;					
						}
						break;

					case 'gesturestart' :
						viewerDisplayGestureChangeHandler(event); // Run once so values are defined at first movement.
						if (!gestureInterval) { gestureInterval = window.setInterval(zoomGesture, GESTURE_TEST_DURATION); }
						break;

					case 'gesturechange' :
						gestureIntervalPercent = Math.round(event.scale * 100) / 100;
						zoomGesture(event);
						break;

					case 'gestureend' :
						if (gestureInterval) {
							window.clearInterval(gestureInterval);
							wasGesturing = true;
							gestureInterval = null;
						}
						if (thisViewer.mousePan) { thisViewport.updateView(); }
						break;

					case 'pinchstart' :
						pinchDistanceStart = Z.Utils.calculatePointsDistance(touch.clientX, touch.clientY, touch2.clientX, touch2.clientY);
						viewerDisplayPinchChangeHandler(event); // Run once so values are defined at first movement.
						if (!pinchInterval) { pinchInterval = window.setInterval(zoomPinch, PINCH_TEST_DURATION); }
						break;

					case 'pinchchange' :
						var pinchDistanceCurrent = Z.Utils.calculatePointsDistance(touch.clientX, touch.clientY, touch2.clientX, touch2.clientY);
						pinchIntervalPercent = Math.round((pinchDistanceCurrent / pinchDistanceStart) * 100) / 100;
						zoomPinch(event);
						break;

					case 'pinchend' :
						if (pinchInterval) {
							window.clearInterval(pinchInterval);
							wasPinching = true;
							pinchInterval = null;
						}
						if (thisViewer.mousePan) { thisViewport.updateView(); }
						break;					
				}
			}	
		}

		function getZoomifyEvent (event) {
			var eventType = event.type;
			var multiTouch = (event.touches && event.touches.length > 1);
			var zoomifyEvent = null;

			if (eventType == 'gesturestart' || eventType == 'gesturechange' || eventType == 'gestureend') {
				zoomifyEvent = eventType;

			} else if (!gestureInterval) {

				if ((eventType == 'mousedown' || eventType == 'touchstart') && !pinchInterval) {
					if (!multiTouch) {
						zoomifyEvent = 'start';
					} else {
						zoomifyEvent = 'pinchstart';
					}

				} else if (eventType == 'mousemove' || eventType == 'touchmove') {
					if (!multiTouch && !wasGesturing && !pinchInterval && !wasPinching) {
						zoomifyEvent = 'move';
					} else if (multiTouch) {
						zoomifyEvent = 'pinchchange';
					}

				} else if (eventType == 'mouseup' || eventType == 'touchend' || eventType == 'touchcancel') {
					if (!multiTouch && !wasGesturing && !pinchInterval && !wasPinching) {
						zoomifyEvent = 'end';
					} else {
						zoomifyEvent = 'pinchend';
					}
				}
			}
			return zoomifyEvent;
		}

		function getZoomifyAction (target, clickPt, isAltKey) {
			var zAction = null;

			if (thisViewer.interactive) {
				if (!hotspots && (thisViewer.clickZoom || thisViewer.clickPan || thisViewer.mousePan)) {
					// No annotations, skip editing conditions.
					zAction = 'navigateImage';

				} else {
					// If annotations exist and editing is possible, label or control point targets are possible.
					var editingPermitted = (typeof thisViewer.externalEditPermissionFunction !== 'function' || thisViewer.externalEditPermissionFunction());
					var editingReady = (thisViewer.editMode !== null || thisViewer.labelMode == 'measure');
					var editingEnabled = (!isAltKey && (thisViewer.editing == 'addLabel' || thisViewer.editing == 'editLabel'));
					var editingOn = (editingPermitted && editingReady && editingEnabled);

					// Test if target is existing label.
					var hotspotTarget = getTargetHotspot(target);
					var controlPointCurrent = getTargetControlPoint(clickPt, thisViewer.labelMode);
					if (hotspotTarget !== null && controlPointCurrent === null && polygonComplete) {
						var editableLabel = thisViewport.getLabelEditable(hotspotTarget.internalID);
						if (editingOn && editableLabel) {
							zAction = 'editLabel';
						} else if (editingPermitted && thisViewer.labelClickSelect) {
							zAction = 'selectLabel';
						}

					// Test if target is existing control point. Edit or complete. Control points only present if a label is current and editable.
					} else if (controlPointCurrent !== null && (editingOn || (!editingOn && thisViewer.labelMode == 'measure'))) {
						var hotspotCurrentIndex = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', hotspotCurrentID);
						if (hotspotCurrentIndex != -1) {
							var hotspot = hotspots[hotspotCurrentIndex];
							if (hotspot.polyClosed || controlPointCurrent != 0 || hotspot.polygonPts.length <= 2 || polygonComplete) {
								zAction = 'editControlPoint';
							} else {
								zAction = 'completeLabelPolygon';
							}
						}

					// Test if creating new label or new label and control point.
					} else if (newLabelCounter == 0) {
						if (thisViewer.labelMode == 'fieldofview' || thisViewer.labelMode == 'text' || thisViewer.labelMode == 'counter') {
							zAction = 'createLabelSimple';
						} else if (thisViewer.labelMode == 'shape') {
							zAction = 'createLabelShape';
						} else if (polygonComplete  && thisViewer.editing != 'editLabel' && (thisViewer.labelMode == 'freehand' || thisViewer.labelMode == 'polygon' || thisViewer.labelMode == 'measure')) {
							zAction = 'createLabelAndControlPoint';
						}
						if (thisViewer.labelMode != 'counter') { newLabelCounter = 1; }

					// Test completing open polygon label or creating new control point.
					} else if (newLabelCounter != 0 && !polygonComplete) {
						if (isAltKey) {
							zAction = 'completeLabelPolygon';
						} else {
							zAction = 'createControlPoint';
						}

					// Secondary default action target is zoom rectangle control point.
					} else if (thisViewer.labelMode == 'view' && isAltKey && thisViewer.zoomRectangle) {
						zAction = 'zoomRectangleImage';

					// Default action target is image.	
					} else if (thisViewer.clickZoom || thisViewer.clickPan || thisViewer.mousePan) {
						if (!isAltKey && thisViewer.labelMode != 'view') { thisViewport.setEditModeLabel('view', null, null, null, false, null); }
						zAction = 'navigateImage';
					}
				}
			}

			return zAction;
		}

		this.getTargetHotspot = function (target) {
			return getTargetHotspot(target);
		}

		function getTargetHotspot (target) {
			if (typeof target === 'undefined' || target === null) {
				target = document.getElementById('progressTextBox');
			}
			var hotTarget = null;
			if (target.id.indexOf('hot') != -1 && target.id.indexOf('hotspotDisplay') == -1) {
				hotTarget = target;
			} else if (target.parentNode && target.parentNode.id.indexOf('hot') != -1 && target.parentNode.id.indexOf('hotspotDisplay') == -1) {
				hotTarget = target.parentNode;
			}else if (target.parentNode.parentNode && target.parentNode.parentNode.id.indexOf('hot') != -1 && target.parentNode.parentNode.id.indexOf('hotspotDisplay') == -1) { // Image inside click-link anchor.
				hotTarget = target.parentNode.parentNode;
			} else if (target.parentNode.parentNode.parentNode && target.parentNode.parentNode.parentNode.id.indexOf('hot') != -1 && target.parentNode.parentNode.parentNode.id.indexOf('hotspotDisplay') == -1) { // No click-link anchor.
				hotTarget = target.parentNode.parentNode.parentNode;
			}
			return hotTarget;
		}
		
		function getTargetControlPoint (clickPt, labelMode) {
			var polygonCtrlPtIndex = null;
			if (hotspots) {
				var ctrlPtRadiusScaled = (ctrlPtRadius + 1) / Z.imageZ;
				for (var i = 0, j = hotspots.length; i < j; i++) {
					var hotspot = hotspots[i];
					if (hotspot.mediaType != 'freehand') {
						if (hotspot.internalID == hotspotCurrentID && (hotspot.mediaType == 'shape' || hotspot.media == 'polygon')) {
							if (typeof hotspot.polygonPts !== 'undefined' && hotspot.polygonPts !== null) {
								var polyPts = hotspot.polygonPts.slice(0);
								var clickPtRot = (hotspot.rotation == 0) ? clickPt : Z.Utils.rotatePointOffCenter(hotspot.x, hotspot.y, clickPt.x, clickPt.y, -hotspot.rotation);
								for (var k = 0, m = polyPts.length; k < m; k++) {
									var targetPt = polyPts[k];						
									if (Z.Utils.calculatePointsDistance(clickPtRot.x, clickPtRot.y, targetPt.x, targetPt.y) < ctrlPtRadiusScaled) {
										polygonCtrlPtIndex = k;										
										break;
									}
								}
							}
						}
					}
				}
			}
			return polygonCtrlPtIndex;
		}
		
		function updateImageNavigation (event, mPt, zVal, isAltKey) {
			document.mousemove = null;
			document.mouseup = null;
			var dragTimeEnd = new Date().getTime();
			var dragPtEnd;													
			if (!thisViewer.mouseOutDownPoint) {
				dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
			} else {
				dragPtEnd = thisViewer.mouseOutDownPoint;
			}		
			clickPt = thisViewport.getClickCoordsInImage(event, zVal, thisViewer.mouseOutDownPoint);
			var dragDist = Z.Utils.calculatePointsDistance(dragPtStart.x, dragPtStart.y, dragPtEnd.x, dragPtEnd.y);
			var dragDuration = dragTimeEnd - dragTimeStart;
			if ((dragDist < MOUSECLICK_THRESHOLD_VIEWPORT && dragDuration < MOUSECLICK_THRESHOLD_TIME_VIEWPORT) || (!isAltKey && (thisViewer.labelMode == 'shape' || thisViewer.labelMode == 'freehand'))) {
				if (thisViewer.clickZoom || thisViewer.clickPan) {
					var doubleClick = (clickTimer && thisViewer.doubleClickZoom) ? true : false;
					var clickPtZoom = thisViewport.getClickZoomCoords3D(event, dragPtStart, tierCurrent, tierScale, doubleClick);
				}
				if (thisViewer.clickZoom) {
					if (!thisViewer.doubleClickZoom) {
						// DEV NOTE: Timeout in line below is placeholder workaround for caption anchor failure in Firefox necessary if not implementing single-click delay below.
						var viewerDisplayMouseUpClickZoomTimer = window.setTimeout( function () { thisViewport.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z); }, 1);

					} else {
						if (!clickTimer) { // First click, delay and wait for second click.
							clickTimer = setTimeout(function(event) {
								clickTimer = null;
								thisViewport.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z);
							}, thisViewer.doubleClickDelay);

						} else { // Second click.
							clearTimeout(clickTimer);
							clickTimer = null;
							thisViewport.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z);
						}
					}

				} else if (thisViewer.clickPan) {
					thisViewport.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, thisViewer.imageZ);
				}
				updateZoomRectangle(hotspotCurrentID, controlPointCurrent, clickPt, true, true);

			} else {
				if (thisViewer.labelMode == 'view' && (isAltKey || thisViewer.altKeyIsDown) && thisViewer.zoomRectangle) {
					updateZoomRectangle(hotspotCurrentID, controlPointCurrent, clickPt, true);
				} else if (thisViewer.mousePan && !thisViewer.smoothPan) {
					dragPtCurrent = null;
					thisViewer.updateView();
				}
			}
		}
	
		function updateZoomRectangle (hotspotID, controlPointCurrent, clickPt, close, clear) {
			if (zoomRectangleDragging) {
				if (!close) {
					updateShapeOrPolygon(hotspotID, controlPointCurrent, clickPt);
				} else {
					var zoomRectanglePts = hotspots[hotspotID].polygonPts;
					hotspots.splice(hotspotID, 1);
					zoomRectangleDragging = null;
					hotspotCurrentID = zoomRectanglePriorID;
					if (!thisViewer.measureVisible && !thisViewer.tour && !thisViewer.hotspots && !thisViewer.annotations) {
						hS.display = eS.display = dS.display = 'none';
						Z.Utils.removeEventListener(hotspotDisplay, 'mousedown', Z.Utils.preventDefault);
					}
					if (!clear) { thisViewport.zoomAndPanToZoomRectangle(zoomRectanglePts); }
				}
			}
		}

		function smoothPanStart (newPan) {
			if (thisViewer.smoothPanEasing > 1) {
				// Stop smooth pan interval already in progress, if any.
				smoothPanStop(newPan);

				// Get starting cursor and display positions.
				smoothPanStartPt = dragPtStart;
				if (smoothPanDisplayStartPt === null) { smoothPanDisplayStartPt = new Z.Utils.Point(parseFloat(cS.left), parseFloat(cS.top)); }

				// Start smooth pan interval.
				if (smoothPanInterval === null || newPan) { smoothPanInterval = window.setInterval(smoothPanIntervalHandler, 50); }
			}
		}

		function smoothPanStop (clearPan) {
			if (smoothPanInterval !== null && clearPan) {
				window.clearInterval(smoothPanInterval);
				smoothPanInterval = null;
			}
			smoothPanGliding = null;
			smoothPanDisplayStartPt = smoothPanGlideX = smoothPanGlideY = null;
			smoothPanDeltaX = smoothPanDeltaY = smoothPanLastDeltaX = smoothPanLastDeltaY = 0;
		}

		// Implement drag-pan or drag-glide if no image set of animation type or if zoomed in. Otherwies animate by changing Viewport.
		function smoothPanIntervalHandler () {
			if (!thisViewer.animation || getZoom() != thisViewer.minZ) {
				smoothPanStep();
			} else {
				smoothAnimateStep();
			}
		}

		function smoothPanStep () {
			// Get current display position.
			var displayCurrL = parseFloat(cS.left);
			var displayCurrT = parseFloat(cS.top);

			if (thisViewer.mouseIsDown || smoothPanGliding) {

				// Calculate offsets of mouse and display. Use float endpoint for target if set because mouse is up.
				var targetX = (smoothPanGliding) ? smoothPanGlideX : smoothPanMousePt.x;
				var targetY = (smoothPanGliding) ? smoothPanGlideY : smoothPanMousePt.y;
				var deltaMouseX = targetX - smoothPanStartPt.x;
				var deltaMouseY = targetY - smoothPanStartPt.y;

				// Calculate offsets of display.
				var deltaDisplayX = displayCurrL - smoothPanDisplayStartPt.x;
				var deltaDisplayY = displayCurrT - smoothPanDisplayStartPt.y;

				// Pan the display if mouse offsets do not equal display offsets.
				var smoothPanRequired = ((!isNaN(deltaMouseX) && !isNaN(deltaMouseY) && !isNaN(deltaDisplayX) && !isNaN(deltaDisplayY)) && (deltaMouseX != 0 || deltaMouseY != 0 || deltaDisplayX != 0 || deltaDisplayY != 0));
				if (smoothPanRequired) {

					// Calculate new position of displays container.
					var easingMore = (smoothPanGliding) ? thisViewer.smoothPanGlide : 1;
					var easingEndLess = (smoothPanGliding) ? 1 : 100;
					smoothPanDeltaX = Math.round((((deltaMouseX - deltaDisplayX) / (thisViewer.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);
					smoothPanDeltaY = Math.round((((deltaMouseY - deltaDisplayY) / (thisViewer.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);

					// If dragging track deltas, if gliding use last tracked deltas to constrain glide deltas.
					if (thisViewer.mouseIsDown) {
						smoothPanLastDeltaX = smoothPanDeltaX;
						smoothPanLastDeltaY = smoothPanDeltaY;
					} else {
						if (Math.abs(smoothPanDeltaX) > Math.abs(smoothPanLastDeltaX)) { smoothPanDeltaX = smoothPanLastDeltaX; }
						if (Math.abs(smoothPanDeltaY) > Math.abs(smoothPanLastDeltaY)) { smoothPanDeltaY = smoothPanLastDeltaY; }
					}

					// Constrain and implement new position and if effect constrained, also apply constraint to delta values.
					var newL = displayCurrL + smoothPanDeltaX;
					var newT = displayCurrT + smoothPanDeltaY;
					var constrainedPt = constrainPan(newL, newT, thisViewer.imageZ, thisViewer.imageR, 'container');
					cS.left = constrainedPt.x + 'px';
					cS.top = constrainedPt.y + 'px';
					smoothPanDeltaX -= (newL - constrainedPt.x);
					smoothPanDeltaY -= (newT - constrainedPt.y);

					// Implement oversize backfill if required.
					var deltaX = constrainedPt.x - displayL;
					var deltaY = constrainedPt.y - displayT;
					if (oD && tierBackfillDynamic) {
						redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
					}

					// Set gliding variable false if delta variable reaches zero to finish glide and updateView. Complemented by test in viewportEventsManager in mouseup event.
					if (smoothPanGliding && Math.round(smoothPanDeltaX * easingEndLess) / easingEndLess == 0 && Math.round(smoothPanDeltaY * easingEndLess) / easingEndLess == 0) {
						smoothPanGliding = false;
					}

					// Sync navigator rectangle if visible.
					var currentCenterPt = thisViewport.calculateCurrentCenterCoordinates(constrainedPt, thisViewer.imageZ, thisViewer.imageR);
					if (!thisViewer.comparison || viewportID == 0) {
						if (thisViewer.Navigator) { thisViewer.Navigator.syncNavigatorRectangleToViewport(currentCenterPt); }
					} else {
						if (thisViewer.Navigator2) { thisViewer.Navigator2.syncNavigatorRectangleToViewport(currentCenterPt); }
					}

					// Sync counter tracking.
					if (thisViewer.tracking) { thisViewport.syncTrackingToViewport(); }
					validateCallback('viewChanging'); // DEV NOTE: callback required for HTML Maker features.
				}

			} else if (!thisViewer.mouseIsDown && smoothPanGliding === null && smoothPanDeltaX != 0 && smoothPanDeltaY != 0) {
				// Calculate and record extended pan endpoint to enable drag-glide.
				var testL = displayCurrL + smoothPanLastDeltaX;
				var testT = displayCurrT + smoothPanLastDeltaY;
				var constrainedPt = constrainPan(testL, testT, thisViewer.imageZ, thisViewer.imageR, 'container');
				smoothPanLastDeltaX = constrainedPt.x - displayCurrL;
				smoothPanLastDeltaY = constrainedPt.y - displayCurrT;
				if (smoothPanLastDeltaX != 0 || smoothPanLastDeltaY != 0) {
					smoothPanGlideX = smoothPanMousePt.x + smoothPanLastDeltaX;
					smoothPanGlideY = smoothPanMousePt.y + smoothPanLastDeltaY;
					smoothPanGliding = true;
				}

			} else {
				// Stop smooth pan by clearing interval.
				smoothPanStop(true);
				updateView();
			}
		}

		// For simplicity and to support future optimization, the following animation step function is based on the above pan step function.
		// Frame rate based on drag motion or drag position depending on value in animation XML.  Setting 'motion' recommended for spinning
		// objects, and 'position' recommended for pivoting panoramas. Horizontal and vertical dragging supported by value in animation XML.
		// To increase animation rate, interval speed is prioritized over frame count (speed over smoothness) by skipping frames rather than
		// changes in frames. However, skipping frame changes (intervals) is prioritized over skipping frames where changes in frame content
		// are significant such as with pivoting panoramas ('position' setting used) or when image sets are small in total number of images.
		function smoothAnimateStep (event) {
			thisViewer.animationCount++;

			// Prepare lagging position variable.
			if (smoothAnimationX === null) { smoothAnimationX = parseFloat(cS.left); }
			if (smoothAnimationY === null) { smoothAnimationY = parseFloat(cS.top); }
			var displayCurrL = smoothAnimationX;
			var displayCurrT = smoothAnimationY;

			if (thisViewer.mouseIsDown || smoothPanGliding) {
				// Calculate offsets of mouse and display. Use float endpoint for target if set because mouse is up.
				var targetX = (smoothPanGliding) ? smoothPanGlideX : smoothPanMousePt.x;
				var targetY = (smoothPanGliding) ? smoothPanGlideY : smoothPanMousePt.y;
				var deltaMouseX = targetX - smoothPanStartPt.x;
				var deltaMouseY = targetY - smoothPanStartPt.y;

				// Calculate offsets of display.
				var deltaDisplayX = displayCurrL - smoothPanDisplayStartPt.x;
				var deltaDisplayY = displayCurrT - smoothPanDisplayStartPt.y;

				// Pan the display if mouse offsets do not equal display offsets.
				var smoothPanRequired = ((!isNaN(deltaMouseX) && !isNaN(deltaMouseY) && !isNaN(deltaDisplayX) && !isNaN(deltaDisplayY)) && (deltaMouseX != 0 || deltaMouseY != 0 || deltaDisplayX != 0 || deltaDisplayY != 0));
				if (smoothPanRequired) {

					// Calculate new position of displays container.
					var easingMore = (smoothPanGliding) ? thisViewer.smoothPanGlide : 1;
					var easingEndLess = (smoothPanGliding) ? 1 : 100;
					smoothPanDeltaX = Math.round((((deltaMouseX - deltaDisplayX) / (thisViewer.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);
					smoothPanDeltaY = Math.round((((deltaMouseY - deltaDisplayY) / (thisViewer.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);

					// If dragging track deltas, if gliding use last tracked deltas to constrain glide deltas.
					if (thisViewer.mouseIsDown) {
						smoothPanLastDeltaX = smoothPanDeltaX;
						smoothPanLastDeltaY = smoothPanDeltaY;
					} else {
						if (Math.abs(smoothPanDeltaX) > Math.abs(smoothPanLastDeltaX)) { smoothPanDeltaX = smoothPanLastDeltaX; }
						if (Math.abs(smoothPanDeltaY) > Math.abs(smoothPanLastDeltaY)) { smoothPanDeltaY = smoothPanLastDeltaY; }
					}

					// Constrain and implement new position and if effect constrained, also apply constraint to delta values.
					var newL = displayCurrL + smoothPanDeltaX;
					var newT = displayCurrT + smoothPanDeltaY;
					smoothAnimationX = newL;
					smoothAnimationY = newT;

					// Adjust animation speed by skipping frame changes (intervals) or by skipping frames.
					var deltaAnimationAxis, skipCalls, skipFrames, animationGap;
					if (thisViewer.animator == 'motion') {
						deltaAnimationAxis = (thisViewer.animationAxis == 'horizontal') ? smoothPanDeltaX : smoothPanDeltaY;
						dimensionAxis = (thisViewer.animationAxis == 'horizontal') ? viewW : viewH;
						skipCalls = Math.round(optimalMotionImages / thisViewer.imageSetLength);
						skipFrames = (deltaAnimationAxis / 40);
						animationGap = 0;
					} else if (thisViewer.animator == 'position') {
						deltaAnimationAxis = (thisViewer.animationAxis == 'horizontal') ? deltaDisplayX : deltaDisplayY;
						dimensionAxis = (thisViewer.animationAxis == 'horizontal') ? viewW : viewH;
						skipCalls = Math.max(0, Math.round(((dimensionAxis / 2) - Math.abs(deltaAnimationAxis)) / optimalPositionDelta));
						skipFrames = 0;
						animationGap = (thisViewer.animationAxis == 'horizontal') ? viewW / 10 : viewH /10;
					}
					if (skipCalls == 0) { skipCalls++; } // Variable represents number of calls to skip but is used as divisor so base value must be 1.

					// Implement frame change.
					if (thisViewer.animationCount % skipCalls == 0) {
						if (deltaAnimationAxis < -animationGap) {
							thisViewer.viewportPrior(skipFrames);
						} else if (deltaAnimationAxis > animationGap) {
							thisViewer.viewportNext(skipFrames);
						}
					}

					// Set gliding variable false if delta variable reaches zero to finish glide. Complemented by test in viewportEventsManager in mouseup event.
					if (smoothPanGliding && Math.round(smoothPanDeltaX * easingEndLess) / easingEndLess == 0 && Math.round(smoothPanDeltaY * easingEndLess) / easingEndLess == 0) {
						smoothPanGliding = false;
					}
				}

			} else if (!thisViewer.mouseIsDown && smoothPanGliding === null && smoothPanDeltaX != 0 && smoothPanDeltaY != 0) {
				// Calculate and record extended pan endpoint to enable drag-glide.
				if (smoothPanLastDeltaX != 0 || smoothPanLastDeltaY != 0) {
					smoothPanGlideX = smoothPanMousePt.x + smoothPanLastDeltaX;
					smoothPanGlideY = smoothPanMousePt.y + smoothPanLastDeltaY;
					smoothPanGliding = true;
				}

			} else {
				// Stop smooth animation by clearing interval.
				smoothPanStop(true);
				smoothAnimationX = null;
				smoothAnimationY = null;
			}
		}

		this.getSmoothPanGliding = function () {
			return smoothPanGliding;
		}

		this.setSmoothPanGliding = function (gliding) {
			smoothPanGliding = gliding;
		}

		function viewerDisplayGestureChangeHandler (event) {
			var event = Z.Utils.event(event);
			event.preventDefault();
			gestureIntervalPercent = Math.round(event.scale * 100) / 100;
		}

		function zoomGesture (event) {
			var sync = false;
			if (!thisViewer.mousePan) { return; }  // Disallow touch panning if parameter false.
			var gestureZoom = calculateGestureZoom(tierCurrent, tierScalePrior, gestureIntervalPercent);
			var gestureZoomConstrained = constrainZoom(gestureZoom);
			if (gestureZoomConstrained != thisViewer.imageZ) { sync = thisViewport.scaleTierToZoom(gestureZoomConstrained); }
		}

		function calculateGestureZoom (tier, scale, gesturePercent) {
			var newScale = scale * gesturePercent;
			var gestureZ = convertTierScaleToZoom(tier, newScale);
			return gestureZ;
		}

		function viewerDisplayPinchChangeHandler (event) {
			var event = Z.Utils.event(event);
			if (event) {
				event.preventDefault();
				var touch = Z.Utils.getFirstTouch(event);
				var touch2 = Z.Utils.getSecondTouch(event);
				if (typeof touch !== 'undefined' && typeof touch2 !== 'undefined') {
					var pinchDistanceCurrent = Z.Utils.calculatePointsDistance(touch.clientX, touch.clientY, touch2.clientX, touch2.clientY);
					pinchIntervalPercent = Math.round((pinchDistanceStart / pinchDistanceCurrent) * 100) / 100;
				}
			}
		}

		function zoomPinch (event) {
			var sync = false;
			if (!thisViewer.mousePan) { return; }  // Disallow touch panning if parameter false.
			var pinchZoom = calculatePinchZoom(tierCurrent, tierScalePrior, pinchIntervalPercent);
			var pinchZoomConstrained = constrainZoom(pinchZoom);
			if (pinchZoomConstrained != thisViewer.imageZ) { sync = thisViewport.scaleTierToZoom(pinchZoomConstrained); }
		}

		function calculatePinchZoom (tier, scale, pinchPercent) {
			var newScale = scale * pinchPercent;
			var pinchZ = convertTierScaleToZoom(tier, newScale);
			return pinchZ;
		}

		// This is executed on change into and also out of full screen mode, and is needed because
		// browsers assign their own change event listener that will fire on entry as well as exit.
		this.fullScreenEscapeHandler = function (event) {
			if (thisViewer.fullScreenEntering) {
				thisViewer.fullScreenEntering = false;
			} else {
				thisViewport.toggleFullViewMode(false, true);
			}
		}

		this.mouseWheelHandler = function (delta, isAltKey) {
			thisViewer.mouseWheelIsDown = true;
			if (thisViewer.mouseWheelCompleteTimer) { window.clearTimeout(thisViewer.mouseWheelCompleteTimer); }
			thisViewer.mouseWheelCompleteTimer = window.setTimeout(thisViewer.mouseWheelCompleteHandler, thisViewer.mouseWheelCompleteDuration);

			if (thisViewer.sliderFocus == 'zoom' && !(thisViewer.imageSet && isAltKey)) {
				// Calculate current step, then target zoom based on step and target scale for current step.
				// Constrain target zoom and scale viewport display to implement.
				var stepZ = (delta > 0) ? zoomStepDistance : -zoomStepDistance;
				var targetScale = tierScale *  (1 + stepZ);
				var targetZoom = thisViewport.convertTierScaleToZoom(tierCurrent, targetScale);
				constrainedZ = constrainZoom(targetZoom);
				if (constrainedZ != thisViewer.imageZ) {
					thisViewer.zooming = (delta > 0) ? 'in' : (delta < 0) ? 'out' : 'stop';
					var sync = thisViewport.scaleTierToZoom(constrainedZ);
				}
				// Debug option: console.log('targetScale: ' + targetScale);

			} else if (thisViewer.sliderFocus == 'imageSet' || isAltKey) {
				// Simple increment or decrement with degree of view updating handled in function updateView.
				if (delta > 0) {
					thisViewer.viewportNext();
				} else if (delta < 0) {
					thisViewer.viewportPrior();
				}
			}
		}

		function displayEventsCoordinatesHandler (event) {
			var event = Z.Utils.event(event);
			if (event) {
				var coordsString;
				if (thisViewer.geoCoordinatesVisible) {
					coordsString = '';
					if (geoTop && geoBottom && geoLeft && geoRight) {
						var coordsPixelPt = thisViewport.getClickCoordsInImage(event);
						coordsString = convertPixelsToLatitudeLongitudeString(coordsPixelPt);
					}
				} else if (thisViewer.tileSource == 'IIIFImageServer') {
					var coordsPixelPt = thisViewport.getClickCoordsInImage(event);
					if (event.type == 'mousemove') {
						coordsString = thisViewport.getViewCoordinatesIIIFString(null, coordsPixelPt, 'show');
					} else if (event.type == 'mousedown' && event.altKey) {
						coordsString = thisViewport.getViewCoordinatesIIIFString(null, coordsPixelPt, 'save') + '\n';
					}
				} else {
					coordsString = getClickZoomCoords3DAsString(event);
				}

				if (event.type == 'mousemove') {
					thisViewer.showCoordinates(coordsString);
				} else if (event.type == 'mousedown' && event.altKey) {
					thisViewer.saveCoordinates(coordsString);
				}
			}
		}
	};


	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::: TOOLBAR FUNCTIONS ::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.ZoomifyToolbar = function (tbViewport) {

		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::::: INIT FUNCTIONS :::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		// Declare variables for toolbar internal self-reference and for initialization completion.
		var thisToolbar = this;
		var isInitialized = false;
		var tbViewportIDStr = tbViewport.getViewportID().toString();

		if (!thisViewer.toolbarInternal) {

			// Load toolbar skins XML file and determine selection mode setting for optional support of
			// small screen devices with large graphic files. Build names list for needed skin files.
			thisViewer.skinPath = Z.Utils.stringRemoveTrailingSlashCharacters(thisViewer.skinPath);
			var netConnector = new Z.NetConnector(thisViewer);
			netConnector.loadXML(thisViewer.skinPath + '/' + Z.Utils.getResource('DEFAULT_SKINXMLFILE'));

			// Declare variables for Toolbar and slider.
			var tlbrH, tbS, trS, btS;
			var toolbarSkinArray = [], toolbarDimensions = [], toolbarSkinFilePaths = [], toolbarSkinSizes = [];
			var SLIDERTESTDURATION_ZOOM = parseInt(Z.Utils.getResource('DEFAULT_SLIDERTESTDURATIONZOOM'), 10);
			var buttonSliderZoomDown = false;
			var sliderIntervalZoom = null, sliderIntervalMousePtZoom = null;
			if (thisViewer.sliderZoomVisible) { var trsZ, trszS, btsZ, btszS; }
			var progressInterval = null, progressTextColor = null;
			var overrideSliderZoom, overrideProgress, overrideLogo, overridePan, overrideReset;
						
			// Declare variables for imageSet slider.
			if (thisViewer.imageSet) {
				var SLIDERTESTDURATION_IMAGESET = parseInt(Z.Utils.getResource('DEFAULT_SLIDERTESTDURATIONIMAGESET'), 10);
				var buttonSliderImageSetDown = false;
				var sliderIntervalImageSet = null, sliderIntervalMousePtImageSet = null;
				var overrideSliderImageSet;
			}

			// Declare variables for image filter panel.
			if (thisViewer.imageFilters) {
				var SLIDERTESTDURATION_FILTER = parseInt(Z.Utils.getResource('DEFAULT_SLIDERTESTDURATIONFILTER'), 10);
				var buttonSliderFilterDown = false;
				var sliderIntervalFilter = null, sliderIntervalMousePtFilter = null;
				var imageFilterPanelW;
				var imageFilterListDP = [];
				var imageFilterPanelVisible = thisViewer.initialImageFilters;
				var imageFilterInProgress = false, imageFilterCurrent = null, imageFilterPrior = null, imageFilterChanged = false;
				var lfbtbS, trsFB, trsfbS, btfB, btfbS; // Brightness.
				var lfctbS, trsFC, trsfcS, btfC, btfcS; // Contrast.
				var lfstbS, trsFS, trsfsS, btfS, btfsS; // Sharpness.
				var lfblbS, trsFBL, trsfblS, btfBL, btfblS; // Blurriness.
				var lfcrbS, trsFCR, trsfcrS, btfCR, btfcrS; // Color Red.
				var lfcgbS, trsFCG, trsfcgS, btfCG, btfcgS; // Color Green.
				var lfcbbS, trsFCB, trsfcbS, btfCB, btfcbS; // Color Blue.
				var lfcrrbS, trsFCRR, trsfcrrS, btfCRR, btfcrrS; // Color Red Range.
				var lfcgrbS, trsFCGR, trsfcgrS, btfCGR, btfcgrS; // Color Green Range.
				var lfcbrbS, trsFCBR, trsfcbrS, btfCBR, btfcbrS; // Color Blue Range.
				var lfgbS, trsFG, trsfgS, btfG, btfgS; // Gamma.
				var lfgrbS, trsFGR, trsfgrS, btfGR, btfgrS; // Gamma Red.
				var lfggbS, trsFGG, trsfggS, btfGG, btfggS; // Gamma Green.
				var lfgbbS, trsFGB, trsfgbS, btfGB, btfgbS; // Gamma Blue.
				var lfhbS, trsFH, trsfhS, btfH, btfhS; // Hue.
				var lfsabS, trsFSA, trsfsaS, btfSA, btfsaS; // Saturation.
				var lflbS, trsFL, trsflS, btfL, btflS; // Lightness.
				var lfwbbS, trsFWB, trsfwbS, btfWB, btfwbS; // White Balance.
				var lfnbS, trsFN, trsfnS, btfN, btfnS; // Noise.
				// Viewport globals not needed for boolean filters because they do not use sliders:
				// Grayscale, Threshold, Inversion, Equalize, Edges, Sepia.

				var filterTrack, filterTrackS, filterButton, filterButtonS, filterButtonOther, filterButtonOtherS;
				var sliderPositionPrior = 0;
			}

		} else {
			var buttonZoomInInternalS, buttonResetInternalS, buttonZoomOutInternalS;
			var colorButtonInternalOver = Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONOVERCOLOR');
			var colorButtonInternalDown = Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONDOWNCOLOR');
			var colorButtonInternalUp = Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONUPCOLOR');
			initializeToolbarInternal();
		}

		function initializeToolbarInternal () {
			var backAlpha = parseFloat(Z.Utils.getResource('UI_TOOLBARINTERNALBACKGROUNDALPHA'));
			var backColor = Z.Utils.getResource('UI_TOOLBARINTERNALBACKGROUNDCOLOR');
			var buttonColor = Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONUPCOLOR');
			var width = 100;
			var height = 25;
			var left = (thisViewer.viewerW / 2 - width / 2);
			var top = (thisViewer.viewerH - height - 10);
			var btnW = Math.round(width / 4);
			var btnH = Math.round(height / 1.5);
			var gapL = (width - (btnW * 3)) / 4;
			var gapT = (height - btnH) / 2;
			
			thisViewer.ToolbarDisplay = Z.Utils.createContainerElement(zvIntID, 'div', 'ToolbarDisplay', 'inline-block', 'absolute', 'visible', width + 'px', height + 'px', left + 'px', top + 'px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
			tbS = thisViewer.ToolbarDisplay.style;
			
			//Alternative implementation: with background. Use with opacity of 0.4 on 3 buttons below.
			/*var toolbarBackgroundInternal = Z.Utils.createContainerElement(zvIntID, 'div', 'toolbarBackgroundInternal', 'inline-block', 'absolute', 'visible', width + 'px', height + 'px', '0px', '0px', 'solid', '1px', backColor, '0px', '0px', 'normal');
			Z.Utils.setOpacity(toolbarBackgroundInternal, backAlpha, backColor);
			thisViewer.ToolbarDisplay.appendChild(toolbarBackgroundInternal);
			toolbarBackgroundInternal.style.borderRadius='4px';*/

			//DEV NOTE: Placeholder solution for difference between vertical placement of text node in Firefox vs other browsers.
			var vertAlign = (Z.browser == Z.browsers.FIREFOX || Z.browser == Z.browsers.SAFARI) ? 15 : 17;

			var buttonZoomOutInternal = Z.Utils.createContainerElement(zvIntID, 'div', 'buttonZoomOutInternal', 'inline-block', 'absolute', 'visible', btnW + 'px', btnH + 'px', (gapL + 1) + 'px', gapT + 1 +'px', 'none', '0px', buttonColor, '0px', '0px', 'normal');
			Z.Utils.setOpacity(buttonZoomOutInternal, 0.6, backColor);
			buttonZoomOutInternal.setAttribute('title', Z.Utils.getResource('TIP_ZOOMOUT'));
			var textNodeZO = document.createTextNode(Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONZOOMOUTTEXT'));
			buttonZoomOutInternal.appendChild(textNodeZO);
			thisViewer.ToolbarDisplay.appendChild(buttonZoomOutInternal);
			buttonZoomOutInternalS = buttonZoomOutInternal.style;
			buttonZoomOutInternalS.borderRadius='3px';
			Z.Utils.setTextNodeStyle(textNodeZO, 'black', 'verdana', '15px', 'none', 'normal', 'normal', 'normal', 'bold', vertAlign + 'px', 'center', 'none');
			Z.Utils.disableTextInteraction(textNodeZO);

			var buttonResetInternal = Z.Utils.createContainerElement(zvIntID, 'div', 'buttonResetInternal', 'inline-block', 'absolute', 'visible', btnW + 'px', btnH + 'px', (gapL * 2 + btnW) + 1 + 'px', gapT + 1 + 'px', 'none', '0px', buttonColor, '0px', '0px', 'normal');
			Z.Utils.setOpacity(buttonResetInternal, 0.6, backColor);
			buttonResetInternal.setAttribute('title', Z.Utils.getResource('TIP_RESET'));
			var textNodeR = document.createTextNode(Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONRESETTEXT'));
			buttonResetInternal.appendChild(textNodeR);
			thisViewer.ToolbarDisplay.appendChild(buttonResetInternal);
			buttonResetInternalS = buttonResetInternal.style;
			buttonResetInternalS.borderRadius='3px';
			Z.Utils.setTextNodeStyle(textNodeR, 'blue', 'verdana', '15px', 'none', 'normal', 'normal', 'normal', 'bold', vertAlign + 'px', 'center', 'none');
			Z.Utils.disableTextInteraction(textNodeR);

			var buttonZoomInInternal = Z.Utils.createContainerElement(zvIntID, 'div', 'buttonZoomInInternal', 'inline-block', 'absolute', 'visible', btnW + 'px', btnH + 'px', (gapL * 3 + btnW * 2) + 1 + 'px', gapT + 1 + 'px', 'none', '0px', buttonColor, '0px', '0px', 'normal');
			Z.Utils.setOpacity(buttonZoomInInternal, 0.6, backColor);
			buttonZoomInInternal.setAttribute('title', Z.Utils.getResource('TIP_ZOOMIN'));
			var textNodeZI = document.createTextNode(Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONZOOMINTEXT'));
			buttonZoomInInternal.appendChild(textNodeZI);
			thisViewer.ToolbarDisplay.appendChild(buttonZoomInInternal);
			buttonZoomInInternalS = buttonZoomInInternal.style;
			buttonZoomInInternalS.borderRadius='3px';
			Z.Utils.setTextNodeStyle(textNodeZI, 'black', 'verdana', '15px', 'none', 'normal', 'normal', 'normal', 'bold', vertAlign + 'px', 'center', 'none');
			Z.Utils.disableTextInteraction(textNodeZI);

			Z.Utils.addEventListener(buttonZoomOutInternal, 'mouseover', buttonEventsHandlerInternal);
			Z.Utils.addEventListener(buttonZoomOutInternal, 'mousedown', buttonEventsHandlerInternal);
			Z.Utils.addEventListener(buttonZoomOutInternal, 'mouseup', buttonEventsHandlerInternal);
			Z.Utils.addEventListener(buttonZoomOutInternal, 'mouseout', buttonEventsHandlerInternal);
			Z.Utils.addEventListener(buttonResetInternal, 'mouseover', buttonEventsHandlerInternal);
			Z.Utils.addEventListener(buttonResetInternal, 'mousedown', buttonEventsHandlerInternal);
			Z.Utils.addEventListener(buttonResetInternal, 'mouseup', buttonEventsHandlerInternal);
			Z.Utils.addEventListener(buttonResetInternal, 'mouseout', buttonEventsHandlerInternal);
			Z.Utils.addEventListener(buttonZoomInInternal, 'mouseover', buttonEventsHandlerInternal);
			Z.Utils.addEventListener(buttonZoomInInternal, 'mousedown', buttonEventsHandlerInternal);
			Z.Utils.addEventListener(buttonZoomInInternal, 'mouseup', buttonEventsHandlerInternal);
			Z.Utils.addEventListener(buttonZoomInInternal, 'mouseout', buttonEventsHandlerInternal);

			// Ensure proper z-ordering of Viewer elements.
			tbS.zIndex = (thisViewer.baseZIndex + 2).toString();

			// Add toolbar to viewer display.
			thisViewer.ViewerDisplay.appendChild(thisViewer.ToolbarDisplay);

			// Prevent event bubbling.
			Z.Utils.addEventListener(thisViewer.ToolbarDisplay, 'mouseover', Z.Utils.stopPropagation);

			setInitialized(true);
		}
	
		thisViewer.initializeToolbar = function (tlbrSknDims, tlbrSknArr) {
			initializeToolbar(tlbrSknDims, tlbrSknArr);
		}
		
		function initializeToolbar (tlbrSknDims, tlbrSknArr) {
			toolbarSkinArray = tlbrSknArr;
			// Create Toolbar display area for Toolbar buttons and set size and position.
			thisViewer.ToolbarDisplay = Z.Utils.createContainerElement(zvIntID, 'div', 'ToolbarDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '1px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
			tbS = thisViewer.ToolbarDisplay.style;
			tbS.textAlign = 'left'; // Dev Note: this workaround prevents containing aligns from affecting positioning of Toolbar button graphics.

			// Ensure proper z-ordering of Viewer elements.
			tbS.zIndex = (thisViewer.baseZIndex + 2).toString();

			var toolbarBackground = new Z.Utils.Graphic(zvIntID, 'toolbarBackground', thisViewer.skinPath, tlbrSknArr[0], '1px', '1px', '0px', '0px');
			var backAlpha = parseFloat(Z.Utils.getResource('DEFAULT_BACKGROUNDALPHA'));
			var backColorNoAlpha = Z.Utils.getResource('DEFAULT_BACKGROUNDCOLORNOALPHA');
			thisViewer.ToolbarDisplay.appendChild(toolbarBackground.elmt);
			if (!thisViewer.toolbarBackgroundVisible) { Z.Utils.setOpacity(toolbarBackground.elmt, 0, backColorNoAlpha); }

			// DEV NOTE: Optional transparent toolbar background. No parameter in current release, requires skin file review.
			//Z.Utils.setOpacity(toolbarBackground.elmt, backAlpha, backColorNoAlpha);

			// Create toolbar global array to hold skin sizes from XML but use placeholders here
			// and apply actual sizes in drawLayout function called in setSizeAndPosition function.
			toolbarSkinSizes = tlbrSknDims;

			if (thisViewer.logoVisible) {
				var toolbarLogo;
				if (!(Z.Utils.stringValidate(thisViewer.logoCustomPath))) {
					toolbarLogo = new Z.Utils.Graphic(zvIntID, 'toolbarLogo', thisViewer.skinPath, tlbrSknArr[7], '1px', '1px', '1px', '1px');
				} else {
					var logoPath = Z.Utils.cacheProofPath(thisViewer.logoCustomPath);
					toolbarLogo = new Z.Utils.Graphic(zvIntID, 'toolbarLogo', logoPath, null, '1px', '1px', '1px', '1px');
				}

				if (!Z.Utils.stringValidate(thisViewer.logoLinkURL)) {
					toolbarLogo.elmt.setAttribute('title', Z.Utils.getResource('UI_LOGOLINKDISPLAY'));
					thisViewer.ToolbarDisplay.appendChild(toolbarLogo.elmt);
				} else {
					var zlogoAnchor = document.createElement('a');
					zlogoAnchor.setAttribute('href', thisViewer.logoLinkURL);
					zlogoAnchor.setAttribute('target', Z.Utils.getResource('UI_LOGOLINKTARGET'));
					zlogoAnchor.setAttribute('title', Z.Utils.getResource('TIP_LOGO'));
					zlogoAnchor.setAttribute('outline', 'none');
					zlogoAnchor.appendChild(toolbarLogo.elmt);
					thisViewer.ToolbarDisplay.appendChild(zlogoAnchor);
				}

				if (thisViewer.toolbarVisible == 0 || thisViewer.toolbarVisible == 1) {
					var logoDivider = new Z.Utils.Graphic(zvIntID, 'logoDivider', thisViewer.skinPath, tlbrSknArr[8], '1px', '1px', '1px', '1px');
					thisViewer.ToolbarDisplay.appendChild(logoDivider.elmt);
				}
			}

			// Add button container to handle background mouseover events instead of button mouseout events.
			var buttonContainer = Z.Utils.createContainerElement(zvIntID, 'div', 'buttonContainer', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', 'default');
			thisViewer.ToolbarDisplay.appendChild(buttonContainer);
			Z.Utils.addEventListener(buttonContainer, 'mousedown', Z.Utils.preventDefault);
			Z.Utils.addEventListener(buttonContainer, 'mouseover', thisToolbar.backgroundEventsHandler);
			Z.Utils.addEventListener(buttonContainer, 'touchstart', Z.Utils.preventDefault);

			// Add background graphic to button container to ensure IE events fire.
			var buttonBackground = new Z.Utils.Graphic(zvIntID, 'buttonBackground', thisViewer.skinPath, tlbrSknArr[0], '1px', '1px', '0px', '0px');
			buttonContainer.appendChild(buttonBackground.elmt);

			// DEV NOTE: Zero opacity avoids interfering with option to set opacity of of toolbarBackground above.
			Z.Utils.setOpacity(buttonBackground.elmt, '0', '#FBFAFA');

			if (((thisViewer.toolbarVisible != 0 && thisViewer.toolbarVisible != 1) || Z.mobileDevice) && thisViewer.minimizeVisible) {
				var tipResourceMinimize = (thisViewer.hotspots) ? 'TIP_MINIMIZE&TOGGLEHOTSPOTS' : (thisViewer.annotations) ? 'TIP_MINIMIZE&TOGGLEANNOTATIONS' : 'TIP_MINIMIZE';
				var buttonMinimize = new Z.Utils.Button(zvIntID, 'buttonMinimize', null, thisViewer.skinPath, tlbrSknArr[9], tlbrSknArr[10], tlbrSknArr[11], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, tipResourceMinimize, null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				thisViewer.ToolbarDisplay.appendChild(buttonMinimize.elmt);
				var tipResourceExpand = (thisViewer.hotspots) ? 'TIP_EXPAND&TOGGLEHOTSPOTS' : (thisViewer.annotations) ? 'TIP_EXPAND&TOGGLEANNOTATIONS' : 'TIP_EXPAND';
				var buttonExpand = new Z.Utils.Button(zvIntID, 'buttonExpand', null, thisViewer.skinPath, tlbrSknArr[12], tlbrSknArr[13], tlbrSknArr[14], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, tipResourceExpand, null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				thisViewer.ToolbarDisplay.appendChild(buttonExpand.elmt);
			}

			if (thisViewer.zoomButtonsVisible) {
				var buttonZoomOut = new Z.Utils.Button(zvIntID, 'buttonZoomOut', null, thisViewer.skinPath, tlbrSknArr[1], tlbrSknArr[2], tlbrSknArr[3], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_ZOOMOUT', null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				buttonContainer.appendChild(buttonZoomOut.elmt);
			}
			
			if (thisViewer.sliderZoomVisible) {
				var trackSliderZoom = new Z.Utils.Graphic(zvIntID, 'trackSliderZoom', thisViewer.skinPath, tlbrSknArr[15], '1px', '1px', '0px', '0px', 'TIP_SLIDERZOOM');
				buttonContainer.appendChild(trackSliderZoom.elmt);
				Z.Utils.addEventListener(trackSliderZoom.elmt, 'mousedown', buttonEventsHandler);
				Z.Utils.addEventListener(trackSliderZoom.elmt, 'touchstart', buttonEventsHandler);
				Z.Utils.addEventListener(trackSliderZoom.elmt, 'mouseover', buttonEventsHandler);
				var buttonSliderZoom = new Z.Utils.Button(zvIntID, 'buttonSliderZoom', null, thisViewer.skinPath, tlbrSknArr[17], tlbrSknArr[18], tlbrSknArr[19], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_SLIDERZOOM', null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				buttonContainer.appendChild(buttonSliderZoom.elmt);
			}

			if (thisViewer.zoomButtonsVisible) {
				var buttonZoomIn = new Z.Utils.Button(zvIntID, 'buttonZoomIn', null, thisViewer.skinPath, tlbrSknArr[4], tlbrSknArr[5], tlbrSknArr[6], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_ZOOMIN', null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				buttonContainer.appendChild(buttonZoomIn.elmt);
			}

			if (thisViewer.panButtonsVisible) {
				if (thisViewer.zoomButtonsVisible || thisViewer.sliderZoomVisible) {
					var panDivider = new Z.Utils.Graphic(zvIntID, 'panDivider', thisViewer.skinPath, tlbrSknArr[20], '1px', '1px','1px', '1px');
					buttonContainer.appendChild(panDivider.elmt);
					if (!thisViewer.toolbarBackgroundVisible) { Z.Utils.setOpacity(panDivider.elmt, 0, backColorNoAlpha); }
				}
				var buttonPanLeft = new Z.Utils.Button(zvIntID, 'buttonPanLeft', null, thisViewer.skinPath, tlbrSknArr[21], tlbrSknArr[22], tlbrSknArr[23], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANLEFT', null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				buttonContainer.appendChild(buttonPanLeft.elmt);
				var buttonPanUp = new Z.Utils.Button(zvIntID, 'buttonPanUp', null, thisViewer.skinPath, tlbrSknArr[24], tlbrSknArr[25], tlbrSknArr[26], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANUP', null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				buttonContainer.appendChild(buttonPanUp.elmt);
				var buttonPanDown = new Z.Utils.Button(zvIntID, 'buttonPanDown', null, thisViewer.skinPath, tlbrSknArr[27], tlbrSknArr[28], tlbrSknArr[29], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANDOWN', null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				buttonContainer.appendChild(buttonPanDown.elmt);
				var buttonPanRight = new Z.Utils.Button(zvIntID, 'buttonPanRight', null, thisViewer.skinPath, tlbrSknArr[30], tlbrSknArr[31], tlbrSknArr[32], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANRIGHT', null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				buttonContainer.appendChild(buttonPanRight.elmt);
			}
			if (thisViewer.resetVisible) {
				var buttonReset = new Z.Utils.Button(zvIntID, 'buttonReset', null, thisViewer.skinPath, tlbrSknArr[33], tlbrSknArr[34], tlbrSknArr[35], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_RESET', null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				buttonContainer.appendChild(buttonReset.elmt);
			}

			if (thisViewer.fullScreenVisible || thisViewer.fullPageVisible) {
				if (thisViewer.editMode === null) {
					var fullViewDivider = new Z.Utils.Graphic(zvIntID, 'fullViewDivider', thisViewer.skinPath, tlbrSknArr[36], '1px', '1px', '1px', '1px');
					buttonContainer.appendChild(fullViewDivider.elmt);
					if (!thisViewer.toolbarBackgroundVisible) { Z.Utils.setOpacity(fullViewDivider.elmt, 0, backColorNoAlpha); }
				}
				var buttonFullViewExit = new Z.Utils.Button(zvIntID, 'buttonFullViewExit', null, thisViewer.skinPath, tlbrSknArr[40], tlbrSknArr[41], tlbrSknArr[42], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOGGLEFULLVIEWEXIT', null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				buttonContainer.appendChild(buttonFullViewExit.elmt);
				var buttonFullView = new Z.Utils.Button(zvIntID, 'buttonFullView', null, thisViewer.skinPath, tlbrSknArr[37], tlbrSknArr[38], tlbrSknArr[39], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOGGLEFULLVIEW', null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				buttonContainer.appendChild(buttonFullView.elmt);
			}

			if (thisViewer.helpVisible == 1 || thisViewer.helpVisible == 3) {
				var buttonHelp = new Z.Utils.Button(zvIntID, 'buttonHelp', null, thisViewer.skinPath, tlbrSknArr[43], tlbrSknArr[44], tlbrSknArr[45], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_HELP', null, null, null, null, null, null, null, thisViewer.tooltipsVisible);
				buttonContainer.appendChild(buttonHelp.elmt);
			}

			if (thisViewer.progressVisible) {
				// Create with placeholder size and position until drawLayout.
				var progressTextBox = Z.Utils.createContainerElement(zvIntID, 'div', 'progressTextBox', 'inline-block', 'absolute', 'hidden', '1px', '1px', '1px', '1px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', null, true);
				var progressFontSize=toolbarSkinSizes[16];
				buttonContainer.appendChild(progressTextBox);
				var progressTextNode = document.createTextNode(Z.Utils.getResource('DEFAULT_PROGRESSTEXT'));
				progressTextBox.appendChild(Z.Utils.createCenteredElement(zvIntID, progressTextNode, 'progressTextBoxCenteredDiv'));
				if (progressTextColor === null) { progressTextColor = Z.Utils.getResource('DEFAULT_PROGRESSTEXTCOLOR'); }
				Z.Utils.setTextNodeStyle(progressTextNode, progressTextColor, 'verdana', progressFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
				Z.Utils.disableTextInteraction(progressTextNode); // Prevent text selection.
			}

			// Add toolbar to viewer display.
			thisViewer.ViewerDisplay.appendChild(thisViewer.ToolbarDisplay);

			// Set toolbar size, position, and visibility.
			thisViewer.toolbarW = toolbarSkinSizes[0];
			Z.toolbarCurrentW = (thisViewer.toolbarW == -1) ? thisViewer.viewerW : thisViewer.toolbarW;
			thisViewer.toolbarH = tlbrH = toolbarSkinSizes[1];
			
			var toolbarTopAdj = (!thisViewer.toolbarBackgroundVisible) ? parseInt(Z.Utils.getResource('DEFAULT_TOOLBARBACKGROUNDVISIBLEADJUST'), 10) : 0;
			var toolbarTop = (thisViewer.toolbarPosition == 1) ? thisViewer.viewerH - thisViewer.toolbarH - toolbarTopAdj : 0 + toolbarTopAdj;
			
			thisToolbar.setSizeAndPosition(Z.toolbarCurrentW, thisViewer.toolbarH, 0, toolbarTop);

			if (tbViewport && tbViewport.getStatus('initializedViewport')) {
				if (thisViewer.toolbarVisible == 1 && thisViewer.toolbarBackgroundVisible) {
					tbViewport.setSizeAndPosition(thisViewer.viewerW, (thisViewer.viewerH - thisViewer.toolbarH), 0, 0);
					tbViewport.validateXYZDefaults(true);
					tbViewport.updateView(); // DEV NOTE: Review requirement for this refresh in static toolbar contexts.
				}
				var currentZ = tbViewport.getZoom();
				syncSliderToViewportZoom(currentZ);
			}

			show(thisViewer.toolbarVisible == 1 || thisViewer.toolbarVisible == 2 || thisViewer.toolbarVisible == 4 || thisViewer.toolbarVisible == 7);

			// Prevent event bubbling.
			Z.Utils.addEventListener(thisViewer.ToolbarDisplay, 'mouseover', Z.Utils.stopPropagation);

			setInitialized(true);
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::: GET & SET FUNCTIONS :::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		this.getInitialized = function () {
			return getInitialized();
		}

		this.getSkinArray = function () {
			return toolbarSkinArray;
		}

		this.getSkinSizes = function () {
			return toolbarSkinSizes;
		}

		this.show = function (value) {
			show(value);
		}

		this.setVisibility = function (visible) {
			visibility(visible);
		}

		this.minimize = function (value) {
			minimize(value);
		}

		this.setVisibilityAnnotationPanel = function (visible, vpIDs) {
			setVisibilityAnnotationPanel(visible, vpIDs);
		}

		function setVisibilityAnnotationPanel (visible, vpIDs) {
			if (typeof vpIDs === 'undefined' || vpIDs === null) {
				vpIDs = (thisViewer.annotationFileShared) ? '0' : tbViewport.getViewportID().toString();
			}
			var annotPanel = Z.Utils.getElementOfViewerById(zvIntID, 'AnnotationPanelDisplay' + vpIDs);
			if (annotPanel) {
				if (visible && !(thisViewer.measureVisible && thisViewer.editMode === null)) {
					annotPanel.style.display = 'inline-block';
					thisViewer.annotationPanelVisibleState = true;
				} else {
					annotPanel.style.display = 'none'; // Debug option: comment out this line to keep visible on mouseout.
					thisViewer.annotationPanelVisibleState = false;
				}
			}
		}

		this.toggleAnnotationPanelMode = function (editMode) {
			tbViewport.clearAnnotationPanel(tbViewportIDStr);
			tbViewport.setStatus('annotationPanelInitializedViewport', false);
			tbViewport.createAnnotationPanel(tbViewportIDStr);
		}

		this.setVisibilityTrackingPanel = function (visible, vpIDs) {
			setVisibilityTrackingPanel(visible, vpIDs);
		}

		function setVisibilityTrackingPanel (visible, vpIDs) {
			if (typeof vpIDs === 'undefined' || vpIDs === null) {
				vpIDs = (thisViewer.trackingFileShared) ? '0' : tbViewport.getViewportID().toString();
			}
			var trackPanel = Z.Utils.getElementOfViewerById(zvIntID, 'TrackingPanelDisplay' + vpIDs);
			if (trackPanel) {
				if (visible) {
					trackPanel.style.display = 'inline-block';
					thisViewer.trackingPanelVisibleState = true;
				} else {
					trackPanel.style.display = 'none'; // Debug option: comment out this line to keep visible on mouseout.
					thisViewer.trackingPanelVisibleState = false;
				}
			}
		}

		this.setVisibilityUserPanel = function (visible) {
			setVisibilityUserPanel(visible);
		}

		function setVisibilityUserPanel (visible) {
			var usePanel = Z.Utils.getElementOfViewerById(zvIntID, 'userPanelDisplay');
			if (usePanel) {
				if (visible) {
					usePanel.style.display = 'inline-block';
					thisViewer.userPanelVisibleState = true;
				} else {
					usePanel.style.display = 'none'; // Debug option: comment out this line to keep visible on mouseout.
					thisViewer.userPanelVisibleState = false;
				}
			}
		}

		this.showProgress = function () {
			var ptB = Z.Utils.getElementOfViewerById(zvIntID, 'progressTextBox');
			if (ptB) {
				var ptbS = ptB.style;
				if (ptbS) {
					ptbS.display = 'inline-block';
				}
			}
		}

		this.hideProgress = function () {
			var ptB = Z.Utils.getElementOfViewerById(zvIntID, 'progressTextBox');
			if (ptB) {
				var ptbS = ptB.style;
				if (ptbS) {
					ptbS.display = 'none';
				}
			}
		}

		this.updateProgress = function (total, current) {
			if (thisViewer.progressVisible) {
				if (progressInterval) { window.clearInterval(progressInterval); }
				var percentComplete;
				var ptcD = Z.Utils.getElementOfViewerById(zvIntID, 'progressTextBoxCenteredDiv');
				if (ptcD) {
					var ptn = ptcD.firstChild;
					if (ptn) {
						if (total == 0 || current == 0) {
							ptn.nodeValue = 'llllllllll'
							progressInterval = window.setInterval(clearProgress, parseInt(Z.Utils.getResource('DEFAULT_PROGRESSDURATION'), 10));
						} else {
							percentComplete = Math.round(100 - (current / total) * 100);
							var percCompTrunc = Math.round(percentComplete / 10);
							ptn.nodeValue = Z.Utils.stringMultiply('l', percCompTrunc);
						}
					}
				}
			}
		}

		function clearProgress () {
			window.clearInterval(progressInterval);
			progressInterval = null;
			var ptcD = Z.Utils.getElementOfViewerById(zvIntID, 'progressTextBoxCenteredDiv');
			if (ptcD) {
				var ptn = ptcD.firstChild;
				if (ptn) { ptn.nodeValue = ''; }
			}
		}

		// Support Image Set viewing.
		this.setViewport = function (tbVwprt) {
			tbViewport = tbVwprt;
			tbViewportIDStr = tbViewport.getViewportID().toString();
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::::::: CORE FUNCTIONS ::::::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		function getInitialized () {
			return isInitialized;
		}

		function setInitialized (initialized) {
			if (!isInitialized && initialized) {
				isInitialized = true;
				validateCallback('toolbarInitialized');
				thisViewer.validateViewerReady('toolbarInitialized');
			}
		}

		this.parseSkinXML = function (xmlDoc) {
			// Get selection mode for optional small screen graphics fileset.
			thisViewer.skinMode = xmlDoc.getElementsByTagName('SETUP')[0].attributes.getNamedItem('SKINMODE').nodeValue;
			var skinFolder, skinSizesTag;

			// Debug option - forces large skins for mobile device layout testing:
			//thisViewer.skinMode = 2;

			if (thisViewer.skinMode == 1 || (thisViewer.skinMode == 0 && !Z.mobileDevice)) {
				skinFolder = xmlDoc.getElementsByTagName('SETUP')[0].attributes.getNamedItem('FOLDERSTANDARD').nodeValue;
				skinSizesTag = 'SIZESSTANDARD';
			} else {
				skinFolder = xmlDoc.getElementsByTagName('SETUP')[0].attributes.getNamedItem('FOLDERLARGE').nodeValue;
				skinSizesTag = 'SIZESLARGE';
			}

			// Get color value for progress display.
			var progressTextColorAtt = xmlDoc.getElementsByTagName('SETUP')[0].attributes.getNamedItem('PROGRESSCOLOR');
			if (typeof progressTextColorAtt !== 'undefined' && progressTextColorAtt !== null) {
				progressTextColor = xmlDoc.getElementsByTagName('SETUP')[0].attributes.getNamedItem('PROGRESSCOLOR').nodeValue;
			}

			// Get toolbar element dimensions.
			var toolbarSkinSizes = [];
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('TOOLBARW').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('TOOLBARH').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('LOGOW').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('LOGOH').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('DIVIDERW').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('DIVIDERH').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('BUTTONW').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('BUTTONH').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('BUTTONSPAN').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('SLIDERBUTTONW').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('SLIDERBUTTONH').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('SLIDERTRACKW').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('SLIDERTRACKH').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('SLIDERSPAN').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('PROGRESSW').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('PROGRESSH').nodeValue);
			toolbarSkinSizes[toolbarSkinSizes.length] = parseFloat(xmlDoc.getElementsByTagName(skinSizesTag)[0].attributes.getNamedItem('PROGRESSFONTSIZE').nodeValue);

			// Get names of skin files of the Zoomify Toolbar.
			var skinMax, skinFirstAtt, skinFirst, skinLastAtt, skinLast;
			skinMax = (thisViewer.trackingEditMode=='edit') ? 176 : (thisViewer.tracking) ? 164 : (thisViewer.editMode == 'edit' || thisViewer.trackingEditMode == 'edit') ? 161 : (thisViewer.editMode == 'markup') ? 152 : (thisViewer.imageFilters) ? 100 : (thisViewer.screensaver || thisViewer.preloadVisible || thisViewer.tourPath || thisViewer.slidePath || thisViewer.imageSetPath) ? 77 : (thisViewer.rotationVisible) ? 58 : (thisViewer.measureVisible) ? 51 : (thisViewer.helpVisible > 0) ? 45 : (thisViewer.fullScreenVisible || thisViewer.fullPageVisible) ? 45 : (thisViewer.resetVisible) ? 35 : (thisViewer.panButtonsVisible) ? 32 : (thisViewer.sliderZoomVisible) ? 19 : (thisViewer.minimizeVisible) ? 14 : (thisViewer.logoVisible) ? 8 : 6;
			skinFirstAtt = xmlDoc.getElementsByTagName('FILES')[0].attributes.getNamedItem('SKIN0');
			if (skinFirstAtt !== null) { skinFirst = skinFirstAtt.nodeValue; }
			skinLastAtt = xmlDoc.getElementsByTagName('FILES')[0].attributes.getNamedItem('SKIN' + skinMax.toString());
			if (skinLastAtt !== null) { skinLast = skinLastAtt.nodeValue; }
			if (typeof skinFirst !== 'undefined' && Z.Utils.stringValidate(skinFirst) && typeof skinLast !== 'undefined' && Z.Utils.stringValidate(skinLast)) {
				var xmlMissingNames = false;
				for (var i = 0, j = skinMax + 1; i < j; i++) {
					var skinCounter = xmlDoc.getElementsByTagName('FILES')[0].attributes.getNamedItem('SKIN' + i).nodeValue;
					if (Z.Utils.stringValidate(skinCounter)) {
						toolbarSkinFilePaths[i] = skinFolder + '/' + skinCounter;
					} else {
						toolbarSkinFilePaths[i] = 'null';
						xmlMissingNames = true;
					}
				}
				if (xmlMissingNames) { thisViewer.showMessage(Z.Utils.getResource('ERROR_SKINXMLMISSINGNAMES')); }
				thisViewer.initializeToolbar(toolbarSkinSizes, toolbarSkinFilePaths);
			
			} else {
				thisViewer.showMessage(Z.Utils.getResource('ERROR_SKINXMLINVALID'));
			}
		}

		this.setSizeAndPosition = function (width, height, left, top) {
			if (typeof width === 'undefined' || width === null) {
				width = (thisViewer.toolbarVisible > 0) ? Z.toolbarCurrentW : 0;
			} else {
				Z.toolbarCurrentW = width;
			}
			if (typeof height === 'undefined' || height === null) { height = (thisViewer.toolbarVisible > 0 && thisViewer.toolbarVisible != 8) ? tlbrH : 0; }
			if (typeof left === 'undefined' || left === null) { left = 0; }
			if (typeof top === 'undefined' || top === null) { top = (thisViewer.toolbarPosition == 1) ? thisViewer.viewerH - tlbrH : 0; }

			tbS = thisViewer.ToolbarDisplay.style;
			tbS.width = width + 'px';
			tbS.height = height + 'px';
			tbS.left = left + 'px';
			tbS.top = top + 'px';
			drawLayout(width, height);
		}

		function drawLayout (width, height) {
			// Set toolbar width and height as specified in the call to this function by the
			// setSizeAndPosition function.  That function tests for null assignments and uses
			// preset values from the Skins XML file if appropriate.
			var toolbarW = width;
			var toolbarH = height;

			 // Set remaining values to the values in the Skins XML file.
			var logoW = toolbarSkinSizes[2];
			var logoH = toolbarSkinSizes[3];
			var dvdrW = toolbarSkinSizes[4];
			var dvdrH = toolbarSkinSizes[5];
			var btnW = toolbarSkinSizes[6];
			var btnH = toolbarSkinSizes[7];
			var btnSpan = toolbarSkinSizes[8];
			var sldrBtnW = toolbarSkinSizes[9];
			var sldrBtnH = toolbarSkinSizes[10];
			var sldrTrkW = toolbarSkinSizes[11];
			var sldrTrkH = toolbarSkinSizes[12];
			var sldrSpan = toolbarSkinSizes[13];
			var prgW = toolbarSkinSizes[14];
			var prgH = toolbarSkinSizes[15];

			// Calculate positioning values.
			var dx = 0;
			var logoTOffset = (toolbarH - logoH) / 2 + 1;
			var dvdrTOffset = (toolbarH - dvdrH) / 2;
			var btnTOffset = (toolbarH - btnH) / 2;
			var btnMinExpTOffset = (btnTOffset * 1.3);		
			var sldrTrkTOffset = (toolbarH - sldrTrkH) / 2;
			var btnSldrTOffset = (toolbarH - sldrBtnH) / 2;
			var btnMinSpan = (thisViewer.logoVisible == 1) ? 0 : btnSpan / 2;
			var btnExpSpan = (thisViewer.logoVisible == 1) ? 0 : btnSpan / 2;
			var dvdrSpan = btnSpan - (btnW - dvdrW);
			var btnContainerMargin = 20;

			// Calculate width of button area.
			var btnCount = 0;
			var dvdrCount = 0;

			if (thisViewer.zoomButtonsVisible) {
				btnCount += 2;
			}
			if (thisViewer.panButtonsVisible) {
				btnCount += 4;
				dvdrCount += 1;
			}
			if (thisViewer.resetVisible) {
				btnCount += 1;
			}
			if (thisViewer.fullScreenVisible || thisViewer.fullPageVisible) {
				btnCount += 1;
				dvdrCount += 1;
			}
			if (thisViewer.helpVisible) {
				btnCount += 1;
				if (!thisViewer.fullScreenVisible && !thisViewer.fullPageVisible) {
					dvdrCount += 1;
				}
			}
			if (thisViewer.measureVisible) {
				if (!thisViewer.fullScreenVisible && !thisViewer.fullPageVisible) {
					dvdrCount += 1;
				}
				btnCount += 1;
			}
			if (thisViewer.rotationVisible) {
				btnCount += 2;
				dvdrCount += 1;
			}
			if (thisViewer.tour || thisViewer.slideshow) {
				btnCount += 3;
				dvdrCount += 1;
				if (thisViewer.audioContent) {
					btnCount += 1;	// DEV NOTE: Does not currently allow for timing of toolbar initialization vs viewer initialization and tour/slideshow XML parsing.
				}
			}
			if (thisViewer.imageFilters) {
				btnCount += 1;
				dvdrCount += 1;
			}
			if (thisViewer.preloadVisible) {
				btnCount += 1;
				dvdrCount += 1;
			}
			if (thisViewer.comparison && thisViewer.syncVisible) {
				btnCount += 1;
				dvdrCount += 1;
			}

			if (thisViewer.imageSet && thisViewer.sliderImageSetVisible) {
				// Following values separate from standard toolbar slider values for possible separate future use.
				var sldrStackSpan = sldrSpan;
				var imageSetSldrTrkW = sldrTrkW;
				var imageSetSldrTrkH = sldrTrkH;
				overrideSliderImageSet = false;
				btnCount += 2;
			}

			if (!thisViewer.progressVisible) { prgW = 0; }

			var btnSetW = (btnCount * btnSpan) + (dvdrCount * dvdrSpan);

			if (thisViewer.sliderZoomVisible) { btnSetW += sldrSpan; }
			if (thisViewer.imageSet && thisViewer.sliderImageSetVisible) { btnSetW += sldrStackSpan; }

			// Validate toolbar contents fit within toolbar width. If not, implement overrides. First
			// hide slider and recalculate. Next hide, progress display.  Next, hide logo and
			// minimize and maximize buttons. Finally, hide pan buttons.
			overrideSliderZoom = overrideProgress = overrideLogo = overridePan = overrideZoom = false;
			var logoOffset = (thisViewer.logoVisible == 1) ? logoW + 2 : 0;
			var minBtnOffset = (thisViewer.toolbarVisible != 0 && thisViewer.toolbarVisible != 1 && thisViewer.minimizeVisible != 0) ? btnSpan : 0;
			var logoButtonSetW = logoOffset + minBtnOffset;
			var panButtonSetW = (thisViewer.panButtonsVisible == 1) ? (btnSpan * 4) + dvdrSpan : 0;
			var zoomButtonSetW = (thisViewer.zoomButtonsVisible == 1) ? (btnSpan * 2) : 0;
			var resetButtonW = (thisViewer.resetVisible == 1) ? btnSpan : 0;
			var toolbarContentsW = logoButtonSetW + btnContainerMargin + btnSetW + btnContainerMargin + prgW;

			if (toolbarContentsW > toolbarW) {
				overrideSliderZoom = true;
				if ((toolbarContentsW - sldrSpan) > toolbarW) {
					overrideProgress = true;
					if ((toolbarContentsW - sldrSpan - prgW) > toolbarW) {
						overrideLogo = true;
						if ((toolbarContentsW - sldrSpan - prgW - logoButtonSetW) > toolbarW) {
							overrideReset = true;
							if ((toolbarContentsW - sldrSpan - prgW - logoButtonSetW - resetButtonW) > toolbarW) {
								overridePan = true;
								btnSetW -= panButtonSetW;
								if ((toolbarContentsW - sldrSpan - prgW - logoButtonSetW - resetButtonW - panButtonSetW) > toolbarW) {
									overrideZoom = true;
									btnSetW -= zoomButtonSetW;
								}
							}
							btnSetW -= resetButtonW;
						}
						logoButtonSetW = 0;
					}
					prgW = 0;
				}
				btnSetW -= sldrSpan;
			}

			// Calculate position for main button set centered in toolbar.
			var btnSetL = ((toolbarW - btnSetW) / 2) - btnContainerMargin + 3;

			// Set the sizes and positions of the toolbar contents.
			var bG = Z.Utils.getElementOfViewerById(zvIntID, 'toolbarBackground');
			if (bG) {
				bG.style.width = toolbarW + 'px';
				bG.style.height = toolbarH + 'px';
				bG.firstChild.style.width = toolbarW + 'px';
				bG.firstChild.style.height = toolbarH + 'px';
			}

			var bC = Z.Utils.getElementOfViewerById(zvIntID, 'buttonContainer');
			if (bC) {
				bC.style.width = (btnSetW + (btnContainerMargin * 2)) + 'px';
				bC.style.height = toolbarH + 'px';
				bC.style.left = btnSetL + 'px';
			}

			var bB = Z.Utils.getElementOfViewerById(zvIntID, 'buttonBackground');
			if (bB) {
				bB.style.width = toolbarW + 'px';
				Z.Utils.graphicSize(bB, parseFloat(bC.style.width), parseFloat(bC.style.height));
				bB.style.left = '0px';
			}

			var tbL = Z.Utils.getElementOfViewerById(zvIntID, 'toolbarLogo');
			if (tbL) {
				var tblS = tbL.style;
				if (tblS) {
					if (!overrideLogo) {
						tblS.display = 'inline-block';
						Z.Utils.graphicSize(tbL, logoW, logoH);
						tblS.left = dx + 'px';
						tblS.top = logoTOffset + 'px';
						dx += logoW + 2;
						var logoD = Z.Utils.getElementOfViewerById(zvIntID, 'logoDivider');
						if (logoD) {
							Z.Utils.graphicSize(logoD, dvdrW, dvdrH);
							var ldS = logoD.style;
							ldS.left = dx + 'px';
							ldS.top = dvdrTOffset + 'px';
						}
					} else {
						tblS.display = 'none';
					}
				}
			}

			if (thisViewer.toolbarVisible != 0 && thisViewer.toolbarVisible != 1) {
				var bM = Z.Utils.getElementOfViewerById(zvIntID, 'buttonMinimize');
				var bE = Z.Utils.getElementOfViewerById(zvIntID, 'buttonExpand');
				if (bM && bE) {
					var bmS = bM.style;
					var beS = bE.style;
					if (bmS && beS) {
						if (!overrideLogo) {
							bmS.display = 'inline-block';
							beS.display = 'inline-block';
							Z.Utils.buttonSize(bM, btnW, btnH);
							Z.Utils.buttonSize(bE, btnW, btnH);
							bmS.left = dx + btnMinSpan + 'px';
							bmS.top = btnMinExpTOffset + 'px';
							beS.left = dx + btnExpSpan + 'px';
							beS.top = btnMinExpTOffset + 'px';
						} else {
							bmS.display = 'none';
							beS.display = 'none';
						}
					}
				}
			}

			dx = btnContainerMargin; // Reset to adjust for placement within buttonContainer which is offset.

			if (!overrideZoom) {
				var bZO = Z.Utils.getElementOfViewerById(zvIntID, 'buttonZoomOut');
				if (bZO) {
					Z.Utils.buttonSize(bZO, btnW, btnH);
					var bzoS = bZO.style;
					bzoS.left = dx + 'px';
					bzoS.top = btnTOffset + 'px';
					dx += btnSpan;
				}
								
				trsZ = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderZoom');
				btsZ = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderZoom');
				if (trsZ && btsZ) {
					trszS = trsZ.style;
					btszS = btsZ.style;
					if (trszS && btszS) {
						if (!overrideSliderZoom) {
							trszS.display = 'inline-block';
							btszS.display = 'inline-block';
							Z.Utils.graphicSize(trsZ, sldrTrkW, sldrTrkH);
							trszS.left = (dx - 2) + 'px';
							trszS.top = sldrTrkTOffset + 'px';
							Z.Utils.buttonSize(btsZ, sldrBtnW, sldrBtnH);
							btszS.left = parseFloat(trszS.left) + 'px';
							btszS.top = btnSldrTOffset + 'px';
							dx += sldrSpan;
						} else {
							trszS.display = 'none';
							btszS.display = 'none';
						}
					}
				}
				var bZI = Z.Utils.getElementOfViewerById(zvIntID, 'buttonZoomIn');
				if (bZI) {
					Z.Utils.buttonSize(bZI, btnW, btnH);
					var bziS = bZI.style;
					bziS.left = dx + 'px';
					bziS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
			}

			if (!overridePan) {
				var pnD = Z.Utils.getElementOfViewerById(zvIntID, 'panDivider');
				if (pnD) {
					Z.Utils.graphicSize(pnD, dvdrW, dvdrH);
					var pndS = pnD.style;
					pndS.left = dx + 'px';
					pndS.top = dvdrTOffset + 'px';
					dx += dvdrSpan;
				}
				var bPL = Z.Utils.getElementOfViewerById(zvIntID, 'buttonPanLeft');
				if (bPL) {
					Z.Utils.buttonSize(bPL, btnW, btnH);
					var bplS = bPL.style;
					bplS.left = dx + 'px';
					bplS.top = btnTOffset + 'px';
					dx += btnSpan;
				}
				var bPU = Z.Utils.getElementOfViewerById(zvIntID, 'buttonPanUp');
				if (bPU) {
					Z.Utils.buttonSize(bPU, btnW, btnH);
					var bpuS = bPU.style;
					bpuS.left = dx + 'px';
					bpuS.top = btnTOffset + 'px';
					dx += btnSpan;
				}
				var bPD = Z.Utils.getElementOfViewerById(zvIntID, 'buttonPanDown');
				if (bPD) {
					Z.Utils.buttonSize(bPD, btnW, btnH);
					var bpdS = bPD.style;
					bpdS.left = dx + 'px';
					bpdS.top = btnTOffset + 'px';
					dx += btnSpan;
				}
				var bPR = Z.Utils.getElementOfViewerById(zvIntID, 'buttonPanRight');
				if (bPR) {
					Z.Utils.buttonSize(bPR, btnW, btnH);
					var bprS = bPR.style;
					bprS.left = dx + 'px';
					bprS.top = btnTOffset + 'px';
					dx += btnSpan;
				}
			}
			if (!overrideReset) {
				var bR = Z.Utils.getElementOfViewerById(zvIntID, 'buttonReset');
				if (bR) {
					Z.Utils.buttonSize(bR, btnW, btnH);
					var brS = bR.style;
					brS.left = dx + 'px';
					brS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
			}

			var fvD = Z.Utils.getElementOfViewerById(zvIntID, 'fullViewDivider');
			if (fvD) {
				Z.Utils.graphicSize(fvD, dvdrW, dvdrH);
				var fvdS = fvD.style;
				fvdS.left = dx + 'px';
				fvdS.top = dvdrTOffset + 'px';
				dx += dvdrSpan;
			}
			var bFVE = Z.Utils.getElementOfViewerById(zvIntID, 'buttonFullViewExit');
			if (bFVE) {
				Z.Utils.buttonSize(bFVE, btnW, btnH);
				var bfveS = bFVE.style;
				bfveS.left = dx + 'px';
				bfveS.top = btnTOffset + 'px';

				// Set full view or full view exit button visible based on full view status.
				bfveS.display = (thisViewer.fullView) ? 'inline-block' : 'none';
			}
			var bFV = Z.Utils.getElementOfViewerById(zvIntID, 'buttonFullView');
			if (bFV) {
				Z.Utils.buttonSize(bFV, btnW, btnH);
				var bfvS = bFV.style;
				bfvS.left = dx + 'px';
				bfvS.top = btnTOffset + 'px';
				dx += btnSpan + 1;

				// Set measure or measure exit button visible based on full view status.
				bfvS.display = (thisViewer.fullView) ? 'none' : 'inline-block';
			}

			var mD = Z.Utils.getElementOfViewerById(zvIntID, 'measureDivider');
			if (mD) {
				Z.Utils.graphicSize(mD, dvdrW, dvdrH);
				var mdS = mD.style;
				mdS.left = dx + 'px';
				mdS.top = dvdrTOffset + 'px';
				dx += dvdrSpan;
			}
			if (thisViewer.editMode === null) {
				var bME = Z.Utils.getElementOfViewerById(zvIntID, 'buttonMeasureExit');
				if (bME) {
					Z.Utils.buttonSize(bME, btnW, btnH);
					var bmeS = bME.style;
					bmeS.left = dx + 'px';
					bmeS.top = btnTOffset + 'px';

					// Set measure or measure exit button visible based on measuring status.
					bmeS.display = (thisViewer.labelMode == 'measure') ? 'inline-block' : 'none';
				}
			}
			var bM = Z.Utils.getElementOfViewerById(zvIntID, 'buttonMeasure');
			if (bM) {
				Z.Utils.buttonSize(bM, btnW, btnH);
				var bmS = bM.style;
				bmS.left = dx + 'px';
				bmS.top = btnTOffset + 'px';
				dx += btnSpan + 1;

				// Set measure or measure exit button visible based on measuring status.
				bmS.display = (thisViewer.labelMode == 'measure') ? 'none' : 'inline-block';
			}

			var rD = Z.Utils.getElementOfViewerById(zvIntID, 'rotateDivider');
			if (rD ) {
				Z.Utils.graphicSize(rD, dvdrW, dvdrH);
				var rdS = rD.style;
				rdS.left = dx + 'px';
				rdS.top = dvdrTOffset + 'px';
				dx += dvdrSpan;
				var bRCCW = Z.Utils.getElementOfViewerById(zvIntID, 'buttonRotateCounterwise');
				if (bRCCW) {
					Z.Utils.buttonSize(bRCCW, btnW, btnH);
					var brccwS = bRCCW.style;
					brccwS.left = dx + 'px';
					brccwS.top = btnTOffset + 'px';
					dx += btnSpan;
				}
				var bRCW = Z.Utils.getElementOfViewerById(zvIntID, 'buttonRotateClockwise');
				if (bRCW) {
					Z.Utils.buttonSize(bRCW, btnW, btnH);
					var brcwS = bRCW.style;
					brcwS.left = dx + 'px';
					brcwS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
			}

			// Add either tour or slideshow buttons.
			if (thisViewer.tour) {
				var trD = Z.Utils.getElementOfViewerById(zvIntID, 'tourDivider');
				if (trD) {
					Z.Utils.graphicSize(trD, dvdrW, dvdrH);
					var trdS = trD.style;
					trdS.left = dx + 'px';
					trdS.top = dvdrTOffset + 'px';
					dx += dvdrSpan;
					var bTP = Z.Utils.getElementOfViewerById(zvIntID, 'buttonTourPrior');
					if (bTP) {
						Z.Utils.buttonSize(bTP, btnW, btnH);
						var btpS = bTP.style;
						btpS.left = dx + 'px';
						btpS.top = btnTOffset + 'px';
						dx += btnSpan + 1;
					}
					var bTN = Z.Utils.getElementOfViewerById(zvIntID, 'buttonTourNext');
					if (bTN) {
						Z.Utils.buttonSize(bTN, btnW, btnH);
						var btnS = bTN.style;
						btnS.left = dx + 'px';
						btnS.top = btnTOffset + 'px';
						dx += btnSpan + 1;
					}
					var bTRS = Z.Utils.getElementOfViewerById(zvIntID, 'buttonTourStop');
					if (bTRS) {
						Z.Utils.buttonSize(bTRS, btnW, btnH);
						var btrsS = bTRS.style;
						btrsS.left = dx + 'px';
						btrsS.top = btnTOffset + 'px';

						// Set start or stop button visible based on tour playing status.
						btrsS.display = (thisViewer.tourPlaying) ? 'inline-block' : 'none';
					}
					// Do not increment dx so place Show button on Hide button.
					var bTRST = Z.Utils.getElementOfViewerById(zvIntID, 'buttonTourStart');
					if (bTRST) {
						Z.Utils.buttonSize(bTRST, btnW, btnH);
						var btrstS = bTRST.style;
						btrstS.left = dx + 'px';
						btrstS.top = btnTOffset + 'px';
						dx += btnSpan + 1;

						// Set start or stop button visible based on tour playing status.
						btrstS.display = (thisViewer.tourPlaying) ? 'none' : 'inline-block';
					}
				}
			} else if (thisViewer.slideshow) {
				var sSD = Z.Utils.getElementOfViewerById(zvIntID, 'slideshowDivider');
				if (sSD) {
					Z.Utils.graphicSize(sSD, dvdrW, dvdrH);
					var ssdS = sSD.style;
					ssdS.left = dx + 'px';
					ssdS.top = dvdrTOffset + 'px';
					dx += dvdrSpan;
					var bSSP = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSlideshowPrior');
					if (bSSP) {
						Z.Utils.buttonSize(bSSP, btnW, btnH);
						var bsspS = bSSP.style;
						bsspS.left = dx + 'px';
						bsspS.top = btnTOffset + 'px';
						dx += btnSpan + 1;
					}
					var bSSN = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSlideshowNext');
					if (bSSN) {
						Z.Utils.buttonSize(bSSN, btnW, btnH);
						var bssnS = bSSN.style;
						bssnS.left = dx + 'px';
						bssnS.top = btnTOffset + 'px';
						dx += btnSpan + 1;
					}
					var bSSS = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSlideshowStop');
					if (bSSS) {
						Z.Utils.buttonSize(bSSS, btnW, btnH);
						var bsssS = bSSS.style;
						bsssS.left = dx + 'px';
						bsssS.top = btnTOffset + 'px';

						// Set start or stop button visible based on slideshow playing status.
						bsssS.display = (thisViewer.slideshowPlaying) ? 'inline-block' : 'none';
					}
					// Do not increment dx so place Show button on Hide button.
					var bSSST = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSlideshowStart');
					if (bSSST) {
						Z.Utils.buttonSize(bSSST, btnW, btnH);
						var bssstS = bSSST.style;
						bssstS.left = dx + 'px';
						bssstS.top = btnTOffset + 'px';
						dx += btnSpan + 1;

						// Set start or stop button visible based on slideshow playing status.
						bssstS.display = (thisViewer.slideshowPlaying) ? 'none' : 'inline-block';
					}
				}
			} else if (thisViewer.imageSetPath !== null && !thisViewer.comparison) {
				var iSD = Z.Utils.getElementOfViewerById(zvIntID, 'imageSetDivider');
				if (iSD) {
					Z.Utils.graphicSize(iSD, dvdrW, dvdrH);
					var isdS = iSD.style;
					isdS.left = dx + 'px';
					isdS.top = dvdrTOffset + 'px';
					dx += dvdrSpan;
				}
				var bISP = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageSetPrior');
				if (bISP) {
					Z.Utils.buttonSize(bISP, btnW, btnH);
					var bispS = bISP.style;
					bispS.left = dx + 'px';
					bispS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
				trsiS = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderImageSet');
				btsiS = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderImageSet');
				if (trsiS && btsiS) {
					trsisS = trsiS.style;
					btsisS = btsiS.style;
					if (trsisS && btsisS) {
						if (!overrideSliderImageSet) {
							trsisS.display = 'inline-block';
							btsisS.display = 'inline-block';
							Z.Utils.graphicSize(trsiS, imageSetSldrTrkW, imageSetSldrTrkH);
							trsisS.left = (dx - 2) + 'px';
							trsisS.top = (sldrTrkTOffset - 4) + 'px';
							Z.Utils.buttonSize(btsiS, sldrBtnW, sldrBtnH);
							btsisS.left = parseFloat(trsisS.left) + 'px';
							btsisS.top = btnSldrTOffset + 'px';
							dx += sldrStackSpan;
						} else {
							trsisS.display = 'none';
							btsisS.display = 'none';
						}
					}
				}
				var bISN = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageSetNext');
				if (bISN) {
					Z.Utils.buttonSize(bISN, btnW, btnH);
					var bisnS = bISN.style;
					bisnS.left = dx + 'px';
					bisnS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
			}

			// Add either audio buttons if adding tour or slideshow buttons, but Hide both buttons
			// until tour or slideshow XML is parsed and can determine if audio content exists.
			if (thisViewer.tour || thisViewer.slideshow) {
				var bAM = Z.Utils.getElementOfViewerById(zvIntID, 'buttonAudioMuted');
				if (bAM) {
					Z.Utils.buttonSize(bAM, btnW, btnH);
					var bamS = bAM.style;
					bamS.left = dx + 'px';
					bamS.top = btnTOffset + 'px';
					bamS.display = 'none';
				}
				// Do not increment dx so place On button on Mute button.
				var bAO = Z.Utils.getElementOfViewerById(zvIntID, 'buttonAudioOn');
				if (bAO) {
					Z.Utils.buttonSize(bAO, btnW, btnH);
					var baoS = bAO.style;
					baoS.left = dx + 'px';
					baoS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
					baoS.display = 'none';
				}
				tbViewport.initializeAudioMuteButtons();
			}

			// Add filter panel.
			if (thisViewer.imageFilters) {
				var ifD = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterDivider');
				if (ifD ) {
					Z.Utils.graphicSize(ifD, dvdrW, dvdrH);
					var ifdS = ifD.style;
					ifdS.left = dx + 'px';
					ifdS.top = dvdrTOffset + 'px';
					dx += dvdrSpan;
					var bFPH = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFilterPanelHide');
					if (bFPH) {
						Z.Utils.buttonSize(bFPH, btnW, btnH);
						var bfphS = bFPH.style;
						bfphS.left = dx + 'px';
						bfphS.top = btnTOffset + 'px';

						// Set Show or Hide button on top.
						bfphS.display = (imageFilterPanelVisible) ? 'inline-block' : 'none';
					}
					// Do not increment dx so place Show button on Hide button.
					var bFPS = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFilterPanelShow');
					if (bFPS) {
						Z.Utils.buttonSize(bFPS, btnW, btnH);
						var bfpsS = bFPS.style;
						bfpsS.left = dx + 'px';
						bfpsS.top = btnTOffset + 'px';
						dx += btnSpan + 1;

						// Set Hide or Show button on top.
						bfpsS.display = (imageFilterPanelVisible) ? 'none' : 'inline-block';
					}

					drawLayoutImageFilterPanel();
				}
			}

			if (thisViewer.preloadVisible) {
				var pD = Z.Utils.getElementOfViewerById(zvIntID, 'preloadDivider');
				var bP = Z.Utils.getElementOfViewerById(zvIntID, 'buttonPreload');
				if (pD && bP) {
					Z.Utils.graphicSize(pD, dvdrW, dvdrH);
					var pdS = pD.style;
					pdS.top = dvdrTOffset + 'px';
					if (!thisViewer.imageSet) {
						pdS.left = dx + 'px';
						dx += dvdrSpan;
					}
					Z.Utils.buttonSize(bP, btnW, btnH);
					var bpS = bP.style;
					bpS.left = dx + 'px';
					bpS.top = btnTOffset + 'px';
					dx += btnSpan;
					if (thisViewer.imageSet) {
						pdS.left = dx + 'px';
						dx += dvdrSpan;
					}
					dx += 8;
				}
			}

			if (thisViewer.helpVisible == 1 || thisViewer.helpVisible == 3) {
				var bH = Z.Utils.getElementOfViewerById(zvIntID, 'buttonHelp');
				if (bH) {
					Z.Utils.buttonSize(bH, btnW, btnH);
					var bhS = bH.style;
					bhS.left = dx + 'px';
					bhS.top = btnTOffset + 'px';
					dx += btnSpan + 8;
				}
			}

			if (thisViewer.comparison && thisViewer.syncVisible) {
				var labelFontSize = parseInt(Z.Utils.getResource('DEFAULT_TOOLBARLABELFONTSIZE'), 10);
				var labelW = 28;
				var labelH = 20;
				var adjLabel = 3;
				var tbLSY = Z.Utils.getElementOfViewerById(zvIntID, 'labelSyncTextBox');
				var cCBSY = Z.Utils.getElementOfViewerById(zvIntID, 'containerFor-checkboxSyncComparison');
				var cbSY = Z.Utils.getElementOfViewerById(zvIntID, 'checkboxSyncComparison');
				if (tbLSY && cCBSY && cbSY) {
					var tblsyS = tbLSY.style;
					tblsyS.width = labelW + 'px';
					tblsyS.height = labelH + 'px';
					tblsyS.left = dx + 'px';
					tblsyS.top = btnTOffset + adjLabel + 'px';
					tblsyS.visibility = 'visible';
					Z.Utils.setTextNodeStyle(tbLSY, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
					var ccbsyS = cCBSY.style;
					ccbsyS.width = (btnW * 1.5) + 'px';
					ccbsyS.height = (btnH * 1.5) + 'px';
					ccbsyS.left = (dx + labelW + 3) + 'px';
					ccbsyS.top = btnTOffset - adjLabel + 'px';
					cbSY.width = btnW;
					cbSY.height = btnH;
					cbSY.checked = thisViewer.initialSync;
				}
			}

			var ptB = Z.Utils.getElementOfViewerById(zvIntID, 'progressTextBox');
			if (ptB) {
				var ptbS = ptB.style;
				if (ptbS) {
					if (!overrideProgress) {
						ptbS.display = 'inline-block';
						ptbS.width = prgW + 'px';
						ptbS.height = prgH + 'px';
						ptbS.left = (toolbarW - parseFloat(bC.style.left) - parseFloat(ptbS.width)) + 'px';
						ptbS.top = ((toolbarH - parseFloat(ptbS.height)) / 2) + 'px';
					} else {
						ptbS.display = 'none';
					}
				}
			}
		}

		function drawLayoutImageFilterPanel () {
			 // Set layout sizes.
			var marginEdgeL = 15;
			var marginEdgeT = 10;
			var labelFontSize = parseInt(Z.Utils.getResource('DEFAULT_IMAGEFILTERPANELLABELFONTSIZE'), 10);
			var textFontSize = parseInt(Z.Utils.getResource('DEFAULT_IMAGEFILTERPANELTEXTFONTSIZE'), 10);
			var textPaddingSmall = parseInt(Z.Utils.getResource('DEFAULT_IMAGEFILTERTEXTPADDINGSMALL'), 10);
			var imageFilterSliderWidthMultiplier = parseInt(Z.Utils.getResource('DEFAULT_IMAGEFILTERSLIDERWIDTHMULTIPLIER'), 10);

			 // Set remaining values to the values in the Skins XML file.
			var btnW = toolbarSkinSizes[6];
			var btnH = toolbarSkinSizes[7];
			var btnSpan = toolbarSkinSizes[8];
			var dvdrW = toolbarSkinSizes[4];
			var dvdrH = toolbarSkinSizes[5];
			var sldrTrkW = toolbarSkinSizes[11] * imageFilterSliderWidthMultiplier;
			var sldrTrkH = toolbarSkinSizes[12];
			var sldrBtnW = toolbarSkinSizes[9];
			var sldrBtnH = toolbarSkinSizes[10];
			var sldrSpan = toolbarSkinSizes[13] * imageFilterSliderWidthMultiplier;
			var fmH = toolbarSkinSizes[15];

			// Calculate positioning values.
			var btnT = marginEdgeT + 2;
			var dvdrSpan = btnSpan - (btnW - dvdrW);
			var dvdrTOffset = (btnH - dvdrH) / 2;
			var sldrTrkTOffset = marginEdgeT + 8;
			var labelW = 90;
			var labelH = 20;
			var adjLabel = 3;
			var fmW = 50;
			var textW = 37;
			var textH = 14;
			var imageFilterListW = parseInt(Z.Utils.getResource('DEFAULT_IMAGEFILTERLISTWIDTH'), 10);
			var filterSliderCount = (thisViewer.brightnessVisible + thisViewer.contrastVisible + thisViewer.sharpnessVisible + thisViewer.blurrinessVisible + thisViewer.colorRedVisible + thisViewer.colorGreenVisible + thisViewer.colorBlueVisible + thisViewer.colorRedRangeVisible + thisViewer.colorGreenRangeVisible + thisViewer.colorBlueRangeVisible +thisViewer.gammaVisible + thisViewer.gammaRedVisible + thisViewer.gammaGreenVisible + thisViewer.gammaBlueVisible + thisViewer.hueVisible + thisViewer.saturationVisible + thisViewer.lightnessVisible + thisViewer.whiteBalanceVisible + thisViewer.noiseVisible);
			var filterSlidersHeight = (btnH + adjLabel * 2) + ((textH + adjLabel + 1) * filterSliderCount) + 10;
			var filterCheckBoxCount = (thisViewer.grayscaleVisible + thisViewer.thresholdVisible + thisViewer.inversionVisible + thisViewer.normalizeVisible + thisViewer.equalizeVisible + thisViewer.edgesVisible + thisViewer.sepiaVisible);
			var filterCheckBoxesHeight = (btnH + adjLabel * 2) * filterCheckBoxCount;
			var filtersTaller = Math.max(filterSlidersHeight, filterCheckBoxesHeight);
			var factorW = (filterCheckBoxCount > 0) ? 2 : 0.96;

			// If range filters, widen slider. If no wide text labels, widen slider more.
			var rangeAdj = (thisViewer.colorRedRangeVisible || thisViewer.colorGreenRangeVisible || thisViewer.colorBlueRangeVisible) ? 50 : 0;
			var rangeAdj2 = !(thisViewer.colorRedVisible || thisViewer.colorGreenVisible || thisViewer.colorBlueVisible || thisViewer.whiteBalanceVisible || thisViewer.gammaRedVisible || thisViewer.gammaGreenVisible || thisViewer.gammaBlueVisible) ? 30 : 0;
			sldrTrkW += (rangeAdj + rangeAdj2);
			sldrSpan += (rangeAdj + rangeAdj2);
			var secondTextElement = (thisViewer.colorRedRangeVisible || thisViewer.colorGreenRangeVisible || thisViewer.colorBlueRangeVisible) ? textW + 5 : 0;
			labelW -= rangeAdj2;

			var panelW = imageFilterPanelW = Math.round(labelW * factorW + sldrTrkW + btnSpan * 2 + btnSpan * factorW + dvdrSpan * factorW + marginEdgeL * factorW - 4 + secondTextElement);
			var panelH = (marginEdgeT * 2 + dvdrH) + filtersTaller;
			var sectionDvdrH = panelH - dvdrH - marginEdgeT * 3.8;
			var panelDvdrW = panelW - marginEdgeL - btnW;
			var panelDvdrH = dvdrW;
			var panelDvdrT = panelH - marginEdgeT - btnH * 1.9;
			var listL = marginEdgeL + 5;
			var listT = panelH - marginEdgeT - btnH - 1;
			var dx = marginEdgeL;
			var dy = sldrTrkTOffset + 2;

			// Size filter panel and position above and left of calling button in toolbar.
			var bFPS = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFilterPanelShow');
			var bCIF = Z.Utils.getElementOfViewerById(zvIntID, 'buttonContainerImageFilter');
			var cliF = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterList');
			if (bCIF && bFPS && cliF) {
				var bfpsL = parseFloat(bFPS.style.left);
				var bfpspL = parseFloat(bFPS.parentNode.style.left);
				var bcifS = bCIF.style;
				bcifS.width = panelW + 'px';
				bcifS.height = panelH + 'px';
				bcifS.left = bfpsL + bfpspL + btnSpan - panelW + 'px';
				bcifS.top = -(panelH + marginEdgeT / 2) + 'px';
				var bGF = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterPanelBackground');
				if (bGF) {
					var bgfS = bGF.style;
					bgfS.width = panelW + 'px';
					bgfS.height = panelH + 'px';
				}

				// Image filter list includes filter history.
				var clifS = cliF.style;
				//clifS.display = 'none'; // Alternative implementation: Hide list.
				clifS.width = imageFilterListW + 'px';
				clifS.left = listL + 'px';
				clifS.top = listT + 'px';

				var lBTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelBrightnessTextBox');
				trsFB = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterBrightness');
				btfB = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterBrightness');
				var tbFBTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-brightnessTextElement');
				if (lBTB && trsFB && btfB && tbFBTE) {
					lfbtbS = lBTB.style;
					trsfbS = trsFB.style;
					btfbS = btfB.style;
					var tbfbteS = tbFBTE.style;
					if (lfbtbS && trsfbS && btfbS && tbfbteS) {
						lfbtbS.width = labelW + 'px';
						lfbtbS.height = labelH + 'px';
						lfbtbS.left = dx + 'px';
						lfbtbS.top = dy - adjLabel + 'px';
						lfbtbS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lBTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfbS.display = 'inline-block';
						btfbS.display = 'inline-block';
						Z.Utils.graphicSize(trsFB, sldrTrkW, sldrTrkH);
						trsfbS.left = dx + labelW + 3 + 'px';
						trsfbS.top = (dy - 4) + 'px'
						Z.Utils.buttonSize(btfB, sldrBtnW, sldrBtnH);
						btfbS.left = parseFloat(trsfbS.left) + 'px'; // Reset below.
						btfbS.top = dy - 4 + 'px';
						tbfbteS.width = textW + 'px';
						tbfbteS.height = textH + 'px';
						tbfbteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfbteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFBTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lCTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelContrastTextBox');
				trsFC = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterContrast');
				btfC = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterContrast');
				var tbFCTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-contrastTextElement');
				if (lCTB && trsFC && btfC && tbFCTE) {
					lfctbS = lCTB.style;
					trsfcS = trsFC.style;
					btfcS = btfC.style;
					var tbfcteS = tbFCTE.style;
					if (lfctbS && trsfcS && btfcS && tbfcteS) {
						lfctbS.width = labelW + 'px';
						lfctbS.height = labelH + 'px';
						lfctbS.left = dx + 'px';
						lfctbS.top = dy - adjLabel + 'px';
						lfctbS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lCTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfcS.display = 'inline-block';
						btfcS.display = 'inline-block';
						Z.Utils.graphicSize(trsFC, sldrTrkW, sldrTrkH);
						trsfcS.left = dx + labelW + 3 + 'px';
						trsfcS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfC, sldrBtnW, sldrBtnH);
						btfcS.left = parseFloat(trsfcS.left) + 'px';
						btfcS.top = dy - 4 + 'px';
						tbfcteS.width = textW + 'px';
						tbfcteS.height = textH + 'px';
						tbfcteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfcteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFCTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lSTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelSharpnessTextBox');
				trsFS = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterSharpness');
				btfS = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterSharpness');
				var tbFSTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-sharpnessTextElement');
				if (lSTB && trsFS && btfS && tbFSTE) {
					lfstbS = lSTB.style;
					trsfsS = trsFS.style;
					btfsS = btfS.style;
					var tbfsteS = tbFSTE.style;
					if (lfstbS && trsfsS && btfsS && tbfsteS) {
						lfstbS.width = labelW + 'px';
						lfstbS.height = labelH + 'px';
						lfstbS.left = dx + 'px';
						lfstbS.top = dy - adjLabel + 'px';
						lfstbS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lSTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfsS.display = 'inline-block';
						btfsS.display = 'inline-block';
						Z.Utils.graphicSize(trsFS, sldrTrkW, sldrTrkH);
						trsfsS.left = dx + labelW + 3 + 'px';
						trsfsS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfS, sldrBtnW, sldrBtnH);
						btfsS.left = parseFloat(trsfsS.left) + 'px';
						btfsS.top = dy - 4 + 'px';
						tbfsteS.width = textW + 'px';
						tbfsteS.height = textH + 'px';
						tbfsteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfsteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFSTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lBLTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelBlurrinessTextBox');
				trsFBL = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterBlurriness');
				btfBL = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterBlurriness');
				var tbFBLTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-blurrinessTextElement');
				if (lBLTB && trsFBL && btfBL && tbFBLTE) {
					lfblbS = lBLTB.style;
					trsfblS = trsFBL.style;
					btfblS = btfBL.style;
					var tbfblteS = tbFBLTE.style;
					if (lfblbS && trsfblS && btfblS && tbfblteS) {
						lfblbS.width = labelW + 'px';
						lfblbS.height = labelH + 'px';
						lfblbS.left = dx + 'px';
						lfblbS.top = dy - adjLabel + 'px';
						lfblbS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lBLTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfblS.display = 'inline-block';
						btfblS.display = 'inline-block';
						Z.Utils.graphicSize(trsFBL, sldrTrkW, sldrTrkH);
						trsfblS.left = dx + labelW + 3 + 'px';
						trsfblS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfBL, sldrBtnW, sldrBtnH);
						btfblS.left = parseFloat(trsfblS.left) + 'px';
						btfblS.top = dy - 4 + 'px';
						tbfblteS.width = textW + 'px';
						tbfblteS.height = textH + 'px';
						tbfblteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfblteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFBLTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lCRTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelColorRedTextBox');
				trsFCR = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterColorRed');
				btfCR = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterColorRed');
				var tbFCRTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-colorRedTextElement');
				if (lCRTB && trsFCR && btfCR && tbFCRTE) {
					lfbtcrS = lCRTB.style;
					trsfcrS = trsFCR.style;
					btfcrS = btfCR.style;
					var tbfcrteS = tbFCRTE.style;
					if (lfbtcrS && trsfcrS && btfcrS && tbfcrteS) {
						lfbtcrS.width = labelW + 'px';
						lfbtcrS.height = labelH + 'px';
						lfbtcrS.left = dx + 'px';
						lfbtcrS.top = dy - adjLabel + 'px';
						lfbtcrS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lCRTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfcrS.display = 'inline-block';
						btfcrS.display = 'inline-block';
						Z.Utils.graphicSize(trsFCR, sldrTrkW, sldrTrkH);
						trsfcrS.left = dx + labelW + 3 + 'px';
						trsfcrS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfCR, sldrBtnW, sldrBtnH);
						btfcrS.left = parseFloat(trsfcrS.left) + 'px'; // Reset below.
						btfcrS.top = dy - 4 + 'px';
						tbfcrteS.width = textW + 'px';
						tbfcrteS.height = textH + 'px';
						tbfcrteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfcrteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFCRTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lCGTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelColorGreenTextBox');
				trsFCG = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterColorGreen');
				btfCG = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterColorGreen');
				var tbFCGTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-colorGreenTextElement');
				if (lCGTB && trsFCG && btfCG && tbFCGTE) {
					lfbtcgS = lCGTB.style;
					trsfcgS = trsFCG.style;
					btfcgS = btfCG.style;
					var tbfcgteS = tbFCGTE.style;
					if (lfbtcgS && trsfcgS && btfcgS && tbfcgteS) {
						lfbtcgS.width = labelW + 'px';
						lfbtcgS.height = labelH + 'px';
						lfbtcgS.left = dx + 'px';
						lfbtcgS.top = dy - adjLabel + 'px';
						lfbtcgS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lCGTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfcgS.display = 'inline-block';
						btfcgS.display = 'inline-block';
						Z.Utils.graphicSize(trsFCG, sldrTrkW, sldrTrkH);
						trsfcgS.left = dx + labelW + 3 + 'px';
						trsfcgS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfCG, sldrBtnW, sldrBtnH);
						btfcgS.left = parseFloat(trsfcgS.left) + 'px'; // Reset below.
						btfcgS.top = dy - 4 + 'px';
						tbfcgteS.width = textW + 'px';
						tbfcgteS.height = textH + 'px';
						tbfcgteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfcgteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFCGTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lCBTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelColorBlueTextBox');
				trsFCB = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterColorBlue');
				btfCB = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterColorBlue');
				var tbFCBTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-colorBlueTextElement');
				if (lCBTB && trsFCB && btfCB && tbFCBTE) {
					lfbtcbS = lCBTB.style;
					trsfcbS = trsFCB.style;
					btfcbS = btfCB.style;
					var tbfcbteS = tbFCBTE.style;
					if (lfbtcbS && trsfcbS && btfcbS && tbfcbteS) {
						lfbtcbS.width = labelW + 'px';
						lfbtcbS.height = labelH + 'px';
						lfbtcbS.left = dx + 'px';
						lfbtcbS.top = dy - adjLabel + 'px';
						lfbtcbS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lCBTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfcbS.display = 'inline-block';
						btfcbS.display = 'inline-block';
						Z.Utils.graphicSize(trsFCB, sldrTrkW, sldrTrkH);
						trsfcbS.left = dx + labelW + 3 + 'px';
						trsfcbS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfCB, sldrBtnW, sldrBtnH);
						btfcbS.left = parseFloat(trsfcbS.left) + 'px'; // Reset below.
						btfcbS.top = dy - 4 + 'px';
						tbfcbteS.width = textW + 'px';
						tbfcbteS.height = textH + 'px';
						tbfcbteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfcbteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFCBTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lCRRTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelColorRedRangeTextBox');
				trsFCRR = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterColorRedRange');
				btfCRR = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterColorRedRange');
				btfCRR2 = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterColorRedRange2');
				var tbFCRRTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-colorRedRangeTextElement');
				var tbFCRRTE2 = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-colorRedRangeTextElement2');
				if (lCRRTB && trsFCRR && btfCRR && btfCRR2 && tbFCRRTE && tbFCRRTE2) {
					lfbtcrrS = lCRRTB.style;
					trsfcrrS = trsFCRR.style;
					btfcrrS = btfCRR.style;
					btfcrr2S = btfCRR2.style;
					tbfcrrteS = tbFCRRTE.style;
					var tbfcrrte2S = tbFCRRTE2.style;
					if (lfbtcrrS && trsfcrrS && btfcrrS && btfcrr2S && tbfcrrteS && tbfcrrte2S) {
						lfbtcrrS.width = labelW + 'px';
						lfbtcrrS.height = labelH + 'px';
						lfbtcrrS.left = dx + 'px';
						lfbtcrrS.top = dy - adjLabel + 'px';
						lfbtcrrS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lCRRTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfcrrS.display = 'inline-block';
						btfcrrS.display = 'inline-block';
						Z.Utils.graphicSize(trsFCRR, sldrTrkW, sldrTrkH);
						trsfcrrS.left = dx + labelW + 3 + 'px';
						trsfcrrS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfCRR, sldrBtnW, sldrBtnH);
						btfcrrS.left = parseFloat(trsfcrrS.left) + 'px'; // Reset below.
						btfcrrS.top = dy - 4 + 'px';
						Z.Utils.buttonSize(btfCRR2, sldrBtnW, sldrBtnH);
						btfcrr2S.left = parseFloat(trsfcrrS.left) + 50 + 'px'; // Reset below.
						btfcrr2S.top = dy - 4 + 'px';
						tbfcrrteS.width = textW + 'px';
						tbfcrrteS.height = textH + 'px';
						tbfcrrteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfcrrteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFCRRTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						tbfcrrte2S.width = textW + 'px';
						tbfcrrte2S.height = textH + 'px';
						tbfcrrte2S.left = dx + labelW + 3 + sldrSpan + textW + 5 + 'px';
						tbfcrrte2S.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFCRRTE2, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lCGRTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelColorGreenRangeTextBox');
				trsFCGR = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterColorGreenRange');
				btfCGR = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterColorGreenRange');
				btfCGR2 = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterColorGreenRange2');
				var tbFCGRTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-colorGreenRangeTextElement');
				var tbFCGRTE2 = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-colorGreenRangeTextElement2');
				if (lCGRTB && trsFCGR && btfCGR && btfCGR2 && tbFCGRTE && tbFCGRTE2) {
					lfbtcgrS = lCGRTB.style;
					trsfcgrS = trsFCGR.style;
					btfcgrS = btfCGR.style;
					btfcgr2S = btfCGR2.style;
					tbfcgrteS = tbFCGRTE.style;
					var tbfcgrte2S = tbFCGRTE2.style;
					if (lfbtcgrS && trsfcgrS && btfcgrS && btfcgr2S && tbfcgrteS && tbfcgrte2S) {
						lfbtcgrS.width = labelW + 'px';
						lfbtcgrS.height = labelH + 'px';
						lfbtcgrS.left = dx + 'px';
						lfbtcgrS.top = dy - adjLabel + 'px';
						lfbtcgrS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lCGRTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfcgrS.display = 'inline-block';
						btfcgrS.display = 'inline-block';
						Z.Utils.graphicSize(trsFCGR, sldrTrkW, sldrTrkH);
						trsfcgrS.left = dx + labelW + 3 + 'px';
						trsfcgrS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfCGR, sldrBtnW, sldrBtnH);
						btfcgrS.left = parseFloat(trsfcgrS.left) + 'px'; // Reset below.
						btfcgrS.top = dy - 4 + 'px';
						Z.Utils.buttonSize(btfCGR2, sldrBtnW, sldrBtnH);
						btfcgr2S.left = parseFloat(trsfcrrS.left) + 50 + 'px'; // Reset below.
						btfcgr2S.top = dy - 4 + 'px';
						tbfcgrteS.width = textW + 'px';
						tbfcgrteS.height = textH + 'px';
						tbfcgrteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfcgrteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFCGRTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						tbfcgrte2S.width = textW + 'px';
						tbfcgrte2S.height = textH + 'px';
						tbfcgrte2S.left = dx + labelW + 3 + sldrSpan + textW + 5 + 'px';
						tbfcgrte2S.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFCGRTE2, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lCBRTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelColorBlueRangeTextBox');
				trsFCBR = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterColorBlueRange');
				btfCBR = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterColorBlueRange');
				btfCBR2 = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterColorBlueRange2');
				var tbFCBRRTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-colorBlueRangeTextElement');
				var tbFCBRRTE2 = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-colorBlueRangeTextElement2');
				if (lCBRTB && trsFCBR && btfCBR && btfCBR2 && tbFCBRRTE && tbFCBRRTE2) {
					lfbtcbrS = lCBRTB.style;
					trsfcbrS = trsFCBR.style;
					btfcbrS = btfCBR.style;
					btfcbr2S = btfCBR2.style;
					tbfcbrteS = tbFCBRRTE.style;
					var tbfcbrte2S = tbFCBRRTE2.style;
					if (lfbtcbrS && trsfcbrS && btfcbrS && btfcbr2S && tbfcbrteS && tbfcbrte2S) {
						lfbtcbrS.width = labelW + 'px';
						lfbtcbrS.height = labelH + 'px';
						lfbtcbrS.left = dx + 'px';
						lfbtcbrS.top = dy - adjLabel + 'px';
						lfbtcbrS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lCBRTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfcbrS.display = 'inline-block';
						btfcbrS.display = 'inline-block';
						Z.Utils.graphicSize(trsFCBR, sldrTrkW, sldrTrkH);
						trsfcbrS.left = dx + labelW + 3 + 'px';
						trsfcbrS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfCBR, sldrBtnW, sldrBtnH);
						btfcbrS.left = parseFloat(trsfcbrS.left) + 'px'; // Reset below.
						btfcbrS.top = dy - 4 + 'px';
						Z.Utils.buttonSize(btfCBR2, sldrBtnW, sldrBtnH);
						btfcbr2S.left = parseFloat(trsfcrrS.left) + 50 + 'px'; // Reset below.
						btfcbr2S.top = dy - 4 + 'px';
						tbfcbrteS.width = textW + 'px';
						tbfcbrteS.height = textH + 'px';
						tbfcbrteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfcbrteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFCBRRTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						tbfcbrte2S.width = textW + 'px';
						tbfcbrte2S.height = textH + 'px';
						tbfcbrte2S.left = dx + labelW + 3 + sldrSpan + textW + 5 + 'px';
						tbfcbrte2S.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFCBRRTE2, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lGTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelGammaTextBox');
				trsFG = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterGamma');
				btfG = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterGamma');
				var tbFGTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-gammaTextElement');
				if (lGTB && trsFG && btfG && tbFGTE) {
					lfbtgS = lGTB.style;
					trsfgS = trsFG.style;
					btfgS = btfG.style;
					var tbfgteS = tbFGTE.style;
					if (lfbtgS && trsfgS && btfgS && tbfgteS) {
						lfbtgS.width = labelW + 'px';
						lfbtgS.height = labelH + 'px';
						lfbtgS.left = dx + 'px';
						lfbtgS.top = dy - adjLabel + 'px';
						lfbtgS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lGTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfgS.display = 'inline-block';
						btfgS.display = 'inline-block';
						Z.Utils.graphicSize(trsFG, sldrTrkW, sldrTrkH);
						trsfgS.left = dx + labelW + 3 + 'px';
						trsfgS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfG, sldrBtnW, sldrBtnH);
						btfgS.left = parseFloat(trsfgS.left) + 'px'; // Reset below.
						btfgS.top = dy - 4 + 'px';
						tbfgteS.width = textW + 'px';
						tbfgteS.height = textH + 'px';
						tbfgteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfgteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFGTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lGRTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelGammaRedTextBox');
				trsFGR = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterGammaRed');
				btfGR = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterGammaRed');
				var tbFGRTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-gammaRedTextElement');
				if (lGRTB && trsFGR && btfGR && tbFGRTE) {
					lfbtgrS = lGRTB.style;
					trsfgrS = trsFGR.style;
					btfgrS = btfGR.style;
					var tbfgrteS = tbFGRTE.style;
					if (lfbtgrS && trsfgrS && btfgrS && tbfgrteS) {
						lfbtgrS.width = labelW + 'px';
						lfbtgrS.height = labelH + 'px';
						lfbtgrS.left = dx + 'px';
						lfbtgrS.top = dy - adjLabel + 'px';
						lfbtgrS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lGRTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfgrS.display = 'inline-block';
						btfgrS.display = 'inline-block';
						Z.Utils.graphicSize(trsFGR, sldrTrkW, sldrTrkH);
						trsfgrS.left = dx + labelW + 3 + 'px';
						trsfgrS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfGR, sldrBtnW, sldrBtnH);
						btfgrS.left = parseFloat(trsfgrS.left) + 'px'; // Reset below.
						btfgrS.top = dy - 4 + 'px';
						tbfgrteS.width = textW + 'px';
						tbfgrteS.height = textH + 'px';
						tbfgrteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfgrteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFGRTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lGGTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelGammaGreenTextBox');
				trsFGG = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterGammaGreen');
				btfGG = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterGammaGreen');
				var tbFGGTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-gammaGreenTextElement');
				if (lGGTB && trsFGG && btfGG && tbFGGTE) {
					lfbtggS = lGGTB.style;
					trsfggS = trsFGG.style;
					btfggS = btfGG.style;
					var tbfggteS = tbFGGTE.style;
					if (lfbtggS && trsfggS && btfggS && tbfggteS) {
						lfbtggS.width = labelW + 'px';
						lfbtggS.height = labelH + 'px';
						lfbtggS.left = dx + 'px';
						lfbtggS.top = dy - adjLabel + 'px';
						lfbtggS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lGGTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfggS.display = 'inline-block';
						btfggS.display = 'inline-block';
						Z.Utils.graphicSize(trsFGG, sldrTrkW, sldrTrkH);
						trsfggS.left = dx + labelW + 3 + 'px';
						trsfggS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfGG, sldrBtnW, sldrBtnH);
						btfggS.left = parseFloat(trsfggS.left) + 'px'; // Reset below.
						btfggS.top = dy - 4 + 'px';
						tbfggteS.width = textW + 'px';
						tbfggteS.height = textH + 'px';
						tbfggteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfggteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFGGTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lGBTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelGammaBlueTextBox');
				trsFGB = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterGammaBlue');
				btfGB = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterGammaBlue');
				var tbFGBTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-gammaBlueTextElement');
				if (lGBTB && trsFGB && btfGB && tbFGBTE) {
					lfbtgbS = lGBTB.style;
					trsfgbS = trsFGB.style;
					btfgbS = btfGB.style;
					var tbfgbteS = tbFGBTE.style;
					if (lfbtgbS && trsfgbS && btfgbS && tbfgbteS) {
						lfbtgbS.width = labelW + 'px';
						lfbtgbS.height = labelH + 'px';
						lfbtgbS.left = dx + 'px';
						lfbtgbS.top = dy - adjLabel + 'px';
						lfbtgbS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lGBTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfgbS.display = 'inline-block';
						btfgbS.display = 'inline-block';
						Z.Utils.graphicSize(trsFGB, sldrTrkW, sldrTrkH);
						trsfgbS.left = dx + labelW + 3 + 'px';
						trsfgbS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfGB, sldrBtnW, sldrBtnH);
						btfgbS.left = parseFloat(trsfgbS.left) + 'px'; // Reset below.
						btfgbS.top = dy - 4 + 'px';
						tbfgbteS.width = textW + 'px';
						tbfgbteS.height = textH + 'px';
						tbfgbteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfgbteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFGBTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lHTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelHueTextBox');
				trsFH = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterHue');
				btfH = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterHue');
				var tbFHTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-hueTextElement');
				if (lHTB && trsFH && btfH && tbFHTE) {
					lfbthS = lHTB.style;
					trsfhS = trsFH.style;
					btfhS = btfH.style;
					var tbfhteS = tbFHTE.style;
					if (lfbthS && trsfhS && btfhS && tbfhteS) {
						lfbthS.width = labelW + 'px';
						lfbthS.height = labelH + 'px';
						lfbthS.left = dx + 'px';
						lfbthS.top = dy - adjLabel + 'px';
						lfbthS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lHTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfhS.display = 'inline-block';
						btfhS.display = 'inline-block';
						Z.Utils.graphicSize(trsFH, sldrTrkW, sldrTrkH);
						trsfhS.left = dx + labelW + 3 + 'px';
						trsfhS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfH, sldrBtnW, sldrBtnH);
						btfhS.left = parseFloat(trsfhS.left) + 'px'; // Reset below.
						btfhS.top = dy - 4 + 'px';
						tbfhteS.width = textW + 'px';
						tbfhteS.height = textH + 'px';
						tbfhteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfhteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFHTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lSATB = Z.Utils.getElementOfViewerById(zvIntID, 'labelSaturationTextBox');
				trsFSA = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterSaturation');
				btfSA = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterSaturation');
				var tbFSATE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-saturationTextElement');
				if (lSATB && trsFSA && btfSA && tbFSATE) {
					lfbtsaS = lSATB.style;
					trsfsaS = trsFSA.style;
					btfsaS = btfSA.style;
					var tbfsateS = tbFSATE.style;
					if (lfbtsaS && trsfsaS && btfsaS && tbfsateS) {
						lfbtsaS.width = labelW + 'px';
						lfbtsaS.height = labelH + 'px';
						lfbtsaS.left = dx + 'px';
						lfbtsaS.top = dy - adjLabel + 'px';
						lfbtsaS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lSATB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfsaS.display = 'inline-block';
						btfsaS.display = 'inline-block';
						Z.Utils.graphicSize(trsFSA, sldrTrkW, sldrTrkH);
						trsfsaS.left = dx + labelW + 3 + 'px';
						trsfsaS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfSA, sldrBtnW, sldrBtnH);
						btfsaS.left = parseFloat(trsfsaS.left) + 'px'; // Reset below.
						btfsaS.top = dy - 4 + 'px';
						tbfsateS.width = textW + 'px';
						tbfsateS.height = textH + 'px';
						tbfsateS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfsateS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFSATE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lLTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelLightnessTextBox');
				trsFL = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterLightness');
				btfL = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterLightness');
				var tbFLTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-lightnessTextElement');
				if (lLTB && trsFL && btfL && tbFLTE) {
					lfbtlS = lLTB.style;
					trsflS = trsFL.style;
					btflS = btfL.style;
					var tbflteS = tbFLTE.style;
					if (lfbtlS && trsflS && btflS && tbflteS) {
						lfbtlS.width = labelW + 'px';
						lfbtlS.height = labelH + 'px';
						lfbtlS.left = dx + 'px';
						lfbtlS.top = dy - adjLabel + 'px';
						lfbtlS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lLTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsflS.display = 'inline-block';
						btflS.display = 'inline-block';
						Z.Utils.graphicSize(trsFL, sldrTrkW, sldrTrkH);
						trsflS.left = dx + labelW + 3 + 'px';
						trsflS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfL, sldrBtnW, sldrBtnH);
						btflS.left = parseFloat(trsflS.left) + 'px'; // Reset below.
						btflS.top = dy - 4 + 'px';
						tbflteS.width = textW + 'px';
						tbflteS.height = textH + 'px';
						tbflteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbflteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFLTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lWBTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelWhiteBalanceTextBox');
				trsFWB = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterWhiteBalance');
				btfWB = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterWhiteBalance');
				var tbFWBTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-whiteBalanceTextElement');
				if (lWBTB && trsFWB && btfWB && tbFWBTE) {
					lfbtwbS = lWBTB.style;
					trsfwbS = trsFWB.style;
					btfwbS = btfWB.style;
					var tbfwbteS = tbFWBTE.style;
					if (lfbtwbS && trsfwbS && btfwbS && tbfwbteS) {
						lfbtwbS.width = labelW + 'px';
						lfbtwbS.height = labelH + 'px';
						lfbtwbS.left = dx + 'px';
						lfbtwbS.top = dy - adjLabel + 'px';
						lfbtwbS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lWBTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfwbS.display = 'inline-block';
						btfwbS.display = 'inline-block';
						Z.Utils.graphicSize(trsFWB, sldrTrkW, sldrTrkH);
						trsfwbS.left = dx + labelW + 3 + 'px';
						trsfwbS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfWB, sldrBtnW, sldrBtnH);
						btfwbS.left = parseFloat(trsfwbS.left) + 'px'; // Reset below.
						btfwbS.top = dy - 4 + 'px';
						tbfwbteS.width = textW + 'px';
						tbfwbteS.height = textH + 'px';
						tbfwbteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfwbteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFWBTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lNTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelNormalizeTextBox');
				trsFN = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterNormalize');
				btfN = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterNormalize');
				var tbFNTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-normalizeTextElement');
				if (lNTB && trsFN && btfN && tbFNTE) {
					lfbtnS = lNTB.style;
					trsfnS = trsFN.style;
					btfnS = btfN.style;
					var tbfnteS = tbFNTE.style;
					if (lfbtnS && trsfnS && btfnS && tbfnteS) {
						lfbtnS.width = labelW + 'px';
						lfbtnS.height = labelH + 'px';
						lfbtnS.left = dx + 'px';
						lfbtnS.top = dy - adjLabel + 'px';
						lfbtnS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lNTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfnS.display = 'inline-block';
						btfnS.display = 'inline-block';
						Z.Utils.graphicSize(trsFN, sldrTrkW, sldrTrkH);
						trsfnS.left = dx + labelW + 3 + 'px';
						trsfnS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfN, sldrBtnW, sldrBtnH);
						btfnS.left = parseFloat(trsfnS.left) + 'px'; // Reset below.
						btfnS.top = dy - 4 + 'px';
						tbfnteS.width = textW + 'px';
						tbfnteS.height = textH + 'px';
						tbfnteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfnteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFNTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lETB = Z.Utils.getElementOfViewerById(zvIntID, 'labelEqualizeTextBox');
				trsFE = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterEqualize');
				btfE = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterEqualize');
				var tbFETE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-equalizeTextElement');
				if (lETB && trsFE && btfE && tbFETE) {
					lfbteS = lETB.style;
					trsfeS = trsFE.style;
					btfeS = btfE.style;
					tbfeteS = tbFETE.style;
					if (lfbteS && trsfeS && btfeS && tbfeteS) {
						lfbteS.width = labelW + 'px';
						lfbteS.height = labelH + 'px';
						lfbteS.left = dx + 'px';
						lfbteS.top = dy - adjLabel + 'px';
						lfbteS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lETB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfeS.display = 'inline-block';
						btfeS.display = 'inline-block';
						Z.Utils.graphicSize(trsFE, sldrTrkW, sldrTrkH);
						trsfeS.left = dx + labelW + 3 + 'px';
						trsfeS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfE, sldrBtnW, sldrBtnH);
						btfeS.left = parseFloat(trsfeS.left) + 'px'; // Reset below.
						btfeS.top = dy - 4 + 'px';
						tbfeteS.width = textW + 'px';
						tbfeteS.height = textH + 'px';
						tbfeteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfeteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFETE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				var lNTB = Z.Utils.getElementOfViewerById(zvIntID, 'labelNoiseTextBox');
				trsFN = Z.Utils.getElementOfViewerById(zvIntID, 'trackSliderFilterNoise');
				btfN = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderFilterNoise');
				var tbFNTE = Z.Utils.getElementOfViewerById(zvIntID, 'textBoxFor-noiseTextElement');
				if (lNTB && trsFN && btfN && tbFNTE) {
					lfbtnS = lNTB.style;
					trsfnS = trsFN.style;
					btfnS = btfN.style;
					tbfnteS = tbFNTE.style;
					if (lfbtnS && trsfnS && btfnS && tbfnteS) {
						lfbtnS.width = labelW + 'px';
						lfbtnS.height = labelH + 'px';
						lfbtnS.left = dx + 'px';
						lfbtnS.top = dy - adjLabel + 'px';
						lfbtnS.visibility = 'visible';
						Z.Utils.setTextNodeStyle(lNTB, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
						trsfnS.display = 'inline-block';
						btfnS.display = 'inline-block';
						Z.Utils.graphicSize(trsFN, sldrTrkW, sldrTrkH);
						trsfnS.left = dx + labelW + 3 + 'px';
						trsfnS.top = (dy - 4) + 'px';
						Z.Utils.buttonSize(btfN, sldrBtnW, sldrBtnH);
						btfnS.left = parseFloat(trsfnS.left) + 'px'; // Reset below.
						btfnS.top = dy - 4 + 'px';
						tbfnteS.width = textW + 'px';
						tbfnteS.height = textH + 'px';
						tbfnteS.left = dx + labelW + 3 + sldrSpan + 'px';
						tbfnteS.top = dy - 6 + 'px';
						Z.Utils.setTextAreaStyle(tbFNTE, 'black', 'verdana', textFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none', textPaddingSmall + 'px');
						dy += dvdrH;
					}
				}

				// Reset position counters for smaller image filter + / - buttons.
				dx = marginEdgeL + labelW + sldrTrkW + 15 + (secondTextElement / 2);
				dy -= 5;

				var bIFM = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFilterMinus');
				if (bIFM) {
					Z.Utils.buttonSize(bIFM, btnW * 0.9, btnH * 0.9);
					var bifmS = bIFM.style;
					bifmS.left = dx + 'px';
					bifmS.top = dy + 'px';
					dx += btnW + 3;
				}

				var bIFP = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFilterPlus');
				if (bIFP) {
					Z.Utils.buttonSize(bIFP, btnW * 0.9, btnH * 0.9);
					var bifpS = bIFP.style;
					bifpS.left = dx + 'px';
					bifpS.top = dy + 'px';
					dx += btnSpan;
				}

				// Reset position counters for image filter checkboxes.
				dx = panelW - marginEdgeL * 1.5 - btnW - labelW;
				dy = sldrTrkTOffset - 4;

				var ifsD = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterStateDivider');
				if (ifsD ) {
					Z.Utils.graphicSize(ifsD, dvdrW, sectionDvdrH);
					var ifsdS = ifsD.style;
					ifsdS.left = (filterCheckBoxCount > 0) ? dx - marginEdgeL + 'px' : -1000 + 'px';
					ifsdS.top = marginEdgeT + 'px';
				}

				var tbLG = Z.Utils.getElementOfViewerById(zvIntID, 'labelGrayscaleTextBox');
				var cCBG = Z.Utils.getElementOfViewerById(zvIntID, 'containerFor-checkboxFilterGrayscale');
				var cbG = Z.Utils.getElementOfViewerById(zvIntID, 'checkboxFilterGrayscale');
				if (tbLG && cCBG && cbG) {
					var tblgS = tbLG.style;
					tblgS.width = labelW + 'px';
					tblgS.height = labelH + 'px';
					tblgS.left = dx + 'px';
					tblgS.top = dy + adjLabel + 'px';
					tblgS.visibility = 'visible';
					Z.Utils.setTextNodeStyle(tbLG, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
					var ccbgS = cCBG.style;
					ccbgS.width = (btnW * 1.5) + 'px';
					ccbgS.height = (btnH * 1.5) + 'px';
					ccbgS.left = (dx + labelW + 3) + 'px';
					ccbgS.top = dy - adjLabel + 'px';
					cbG.width = btnW;
					cbG.height = btnH;
					dy += dvdrH;
				}

				var tbLT = Z.Utils.getElementOfViewerById(zvIntID, 'labelThresholdTextBox');
				var cCBT = Z.Utils.getElementOfViewerById(zvIntID, 'containerFor-checkboxFilterThreshold');
				var cbT = Z.Utils.getElementOfViewerById(zvIntID, 'checkboxFilterThreshold');
				if (tbLT && cCBT && cbT) {
					var tbltS = tbLT.style;
					tbltS.width = labelW + 'px';
					tbltS.height = labelH + 'px';
					tbltS.left = dx + 'px';
					tbltS.top = dy + adjLabel + 'px';
					tbltS.visibility = 'visible';
					Z.Utils.setTextNodeStyle(tbLT, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
					var ccbtS = cCBT.style;
					ccbtS.width = (btnW * 1.5) + 'px';
					ccbtS.height = (btnH * 1.5) + 'px';
					ccbtS.left = (dx + labelW + 3) + 'px';
					ccbtS.top = dy - adjLabel + 'px';
					cbT.width = btnW;
					cbT.height = btnH;
					dy += dvdrH;
				}

				var tbLI = Z.Utils.getElementOfViewerById(zvIntID, 'labelInversionTextBox');
				var cCBI = Z.Utils.getElementOfViewerById(zvIntID, 'containerFor-checkboxFilterInversion');
				var cbI = Z.Utils.getElementOfViewerById(zvIntID, 'checkboxFilterInversion');
				if (tbLI && cCBI && cbI) {
					var tbliS = tbLI.style;
					tbliS.width = labelW + 'px';
					tbliS.height = labelH + 'px';
					tbliS.left = dx + 'px';
					tbliS.top = dy + adjLabel + 'px';
					tbliS.visibility = 'visible';
					Z.Utils.setTextNodeStyle(tbLI, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
					var ccbiS = cCBI.style;
					ccbiS.width = (btnW * 1.5) + 'px';
					ccbiS.height = (btnH * 1.5) + 'px';
					ccbiS.left = (dx + labelW + 3) + 'px';
					ccbiS.top = dy - adjLabel + 'px';
					cbI.width = btnW;
					cbI.height = btnH;
					dy += dvdrH;
				}

				var tbLEQ = Z.Utils.getElementOfViewerById(zvIntID, 'labelEqualizeTextBox');
				var cCEQ = Z.Utils.getElementOfViewerById(zvIntID, 'containerFor-checkboxFilterEqualize');
				var cbEQ = Z.Utils.getElementOfViewerById(zvIntID, 'checkboxFilterEqualize');
				if (tbLEQ && cCEQ && cbEQ) {
					var tbleqS = tbLEQ.style;
					tbleqS.width = labelW + 'px';
					tbleqS.height = labelH + 'px';
					tbleqS.left = dx + 'px';
					tbleqS.top = dy + adjLabel + 'px';
					tbleqS.visibility = 'visible';
					Z.Utils.setTextNodeStyle(tbLEQ, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
					var ccbeqS = cCEQ.style;
					ccbeqS.width = (btnW * 1.5) + 'px';
					ccbeqS.height = (btnH * 1.5) + 'px';
					ccbeqS.left = (dx + labelW + 3) + 'px';
					ccbeqS.top = dy - adjLabel + 'px';
					cbEQ.width = btnW;
					cbEQ.height = btnH;
					dy += dvdrH;
				}

				var tbLE = Z.Utils.getElementOfViewerById(zvIntID, 'labelEdgesTextBox');
				var cCBE = Z.Utils.getElementOfViewerById(zvIntID, 'containerFor-checkboxFilterEdges');
				var cbE = Z.Utils.getElementOfViewerById(zvIntID, 'checkboxFilterEdges');
				if (tbLE && cCBE && cbE) {
					var tbleS = tbLE.style;
					tbleS.width = labelW + 'px';
					tbleS.height = labelH + 'px';
					tbleS.left = dx + 'px';
					tbleS.top = dy + adjLabel + 'px';
					tbleS.visibility = 'visible';
					Z.Utils.setTextNodeStyle(tbLE, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
					var ccbeS = cCBE.style;
					ccbeS.width = (btnW * 1.5) + 'px';
					ccbeS.height = (btnH * 1.5) + 'px';
					ccbeS.left = (dx + labelW + 3) + 'px';
					ccbeS.top = dy - adjLabel + 'px';
					cbE.width = btnW;
					cbE.height = btnH;
					dy += dvdrH;
				}

				var tbLS = Z.Utils.getElementOfViewerById(zvIntID, 'labelSepiaTextBox');
				var cCBS = Z.Utils.getElementOfViewerById(zvIntID, 'containerFor-checkboxFilterSepia');
				var cbS = Z.Utils.getElementOfViewerById(zvIntID, 'checkboxFilterSepia');
				if (tbLS && cCBS && cbS) {
					var tblsS = tbLS.style;
					tblsS.width = labelW + 'px';
					tblsS.height = labelH + 'px';
					tblsS.left = dx + 'px';
					tblsS.top = dy + adjLabel + 'px';
					tblsS.visibility = 'visible';
					Z.Utils.setTextNodeStyle(tbLS, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
					var ccbsS = cCBS.style;
					ccbsS.width = (btnW * 1.5) + 'px';
					ccbsS.height = (btnH * 1.5) + 'px';
					ccbsS.left = (dx + labelW + 3) + 'px';
					ccbsS.top = dy - adjLabel + 'px';
					cbS.width = btnW;
					cbS.height = btnH;
				}

				// Reset position counters for image filter clearing buttons.
				dx = panelW - marginEdgeL - btnW * 5;
				dy = panelH - marginEdgeT - btnH;

				var ifpD = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterPanelDivider');
				if (ifpD ) {
					Z.Utils.graphicSize(ifpD, panelDvdrW, 5.5);
					var ifpdS = ifpD.style;
					ifpdS.left = marginEdgeL + 'px';
					ifpdS.top = panelDvdrT + 2 + 'px';
				}

				var bIFC = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFilterClear');
				if (bIFC) {
					Z.Utils.buttonSize(bIFC, btnW, btnH);
					var bifcS = bIFC.style;
					bifcS.left = dx + 'px';
					bifcS.top = dy + 'px';
					dx += btnSpan;
				}

				var bIFCA = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFiltersClearAll');
				if (bIFCA) {
					Z.Utils.buttonSize(bIFCA, btnW, btnH);
					var bifcaS = bIFCA.style;
					bifcaS.left = dx + 'px';
					bifcaS.top = dy + 'px';
					dx += btnSpan;
				}

				var ifsD3 = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterStateDivider3');
				if (ifsD3) {
					Z.Utils.graphicSize(ifsD3, dvdrW, dvdrH);
					var ifsd3S = ifsD3.style;
					ifsd3S.left = dx + 'px';
					ifsd3S.top = dy + 'px';
					dx += dvdrSpan;
				}

				var bFPHOP = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFilterPanelHideOnPanel');
				if (bFPHOP) {
					Z.Utils.buttonSize(bFPHOP, btnW, btnH);
					var bfphopS = bFPHOP.style;
					bfphopS.left = dx + 'px';
					bfphopS.top = dy + 'px';
				}

				var defVal = null, defVal2 = null;
				if (thisViewer.contrastVisible) {
					setFilterReferences(null, 'contrast', true);
					defVal = tbViewport.getImageFilterDefault('contrast');
					thisToolbar.setImageFilterSlider('contrast', defVal);
					thisToolbar.setImageFilterText('contrast', defVal);
					tbViewport.setImageFilterValuePrior('contrast', defVal);
				}
				if (thisViewer.sharpnessVisible) {
					setFilterReferences(null, 'sharpness', true);
					defVal = tbViewport.getImageFilterDefault('sharpness');
					thisToolbar.setImageFilterSlider('sharpness', defVal);
					thisToolbar.setImageFilterText('sharpness', defVal);
					tbViewport.setImageFilterValuePrior('sharpness', defVal);
				}
				if (thisViewer.blurrinessVisible) {
					setFilterReferences(null, 'blurriness', true);
					defVal = tbViewport.getImageFilterDefault('blurriness');
					thisToolbar.setImageFilterSlider('blurriness', defVal);
					thisToolbar.setImageFilterText('blurriness', defVal);
					tbViewport.setImageFilterValuePrior('blurriness', defVal);
				}
				if (thisViewer.colorRedVisible) {
					setFilterReferences(null, 'colorRed', true);
					defVal = tbViewport.getImageFilterDefault('colorRed');
					thisToolbar.setImageFilterSlider('colorRed', defVal);
					thisToolbar.setImageFilterText('colorRed', defVal);
					tbViewport.setImageFilterValuePrior('colorRed', defVal);
				}
				if (thisViewer.colorGreenVisible) {
					setFilterReferences(null, 'colorGreen', true);
					defVal = tbViewport.getImageFilterDefault('colorGreen');
					thisToolbar.setImageFilterSlider('colorGreen', defVal);
					thisToolbar.setImageFilterText('colorGreen', defVal);
					tbViewport.setImageFilterValuePrior('colorGreen', defVal);
				}
				if (thisViewer.colorBlueVisible) {
					setFilterReferences(null, 'colorBlue', true);
					defVal = tbViewport.getImageFilterDefault('colorBlue');
					thisToolbar.setImageFilterSlider('colorBlue', defVal);
					thisToolbar.setImageFilterText('colorBlue', defVal);
					tbViewport.setImageFilterValuePrior('colorBlue', defVal);
				}
				if (thisViewer.colorRedRangeVisible) {
					setFilterReferences(null, 'colorRedRange', true);
					defVal = tbViewport.getImageFilterDefault('colorRedRange');
					thisToolbar.setImageFilterSlider('colorRedRange', defVal);
					thisToolbar.setImageFilterText('colorRedRange', defVal);
					tbViewport.setImageFilterValuePrior('colorRedRange', defVal);
					setFilterReferences(null, 'colorRedRange2', true);
					defVal2 = tbViewport.getImageFilterDefault('colorRedRange2');
					thisToolbar.setImageFilterSlider('colorRedRange2', defVal2);
					thisToolbar.setImageFilterText('colorRedRange2', defVal2);
					tbViewport.setImageFilterValuePrior('colorRedRange2', defVal2);
				}
				if (thisViewer.colorGreenRangeVisible) {
					setFilterReferences(null, 'colorGreenRange', true);
					defVal = tbViewport.getImageFilterDefault('colorGreenRange');
					thisToolbar.setImageFilterSlider('colorGreenRange', defVal);
					thisToolbar.setImageFilterText('colorGreenRange', defVal);
					tbViewport.setImageFilterValuePrior('colorGreenRange', defVal);
					setFilterReferences(null, 'colorGreenRange2', true);
					defVal2 = tbViewport.getImageFilterDefault('colorGreenRange2');
					thisToolbar.setImageFilterSlider('colorGreenRange2', defVal2);
					thisToolbar.setImageFilterText('colorGreenRange2', defVal2);
					tbViewport.setImageFilterValuePrior('colorGreenRange2', defVal2);
				}
				if (thisViewer.colorBlueRangeVisible) {
					setFilterReferences(null, 'colorBlueRange', true);
					defVal = tbViewport.getImageFilterDefault('colorBlueRange');
					thisToolbar.setImageFilterSlider('colorBlueRange', defVal);
					thisToolbar.setImageFilterText('colorBlueRange', defVal);
					tbViewport.setImageFilterValuePrior('colorBlueRange', defVal);
					setFilterReferences(null, 'colorBlueRange2', true);
					defVal2 = tbViewport.getImageFilterDefault('colorBlueRange2');
					thisToolbar.setImageFilterSlider('colorBlueRange2', defVal2);
					thisToolbar.setImageFilterText('colorBlueRange2', defVal2);
					tbViewport.setImageFilterValuePrior('colorBlueRange2', defVal2);
				}
				if (thisViewer.gammaVisible) {
					setFilterReferences(null, 'gamma', true);
					defVal = tbViewport.getImageFilterDefault('gamma');
					thisToolbar.setImageFilterSlider('gamma', defVal);
					thisToolbar.setImageFilterText('gamma', defVal);
					tbViewport.setImageFilterValuePrior('gamma', defVal);
				}
				if (thisViewer.gammaRedVisible) {
					setFilterReferences(null, 'gammaRed', true);
					defVal = tbViewport.getImageFilterDefault('gammaRed');
					thisToolbar.setImageFilterSlider('gammaRed', defVal);
					thisToolbar.setImageFilterText('gammaRed', defVal);
					tbViewport.setImageFilterValuePrior('gammaRed', defVal);
				}
				if (thisViewer.gammaGreenVisible) {
					setFilterReferences(null, 'gammaGreen', true);
					defVal = tbViewport.getImageFilterDefault('gammaGreen');
					thisToolbar.setImageFilterSlider('gammaGreen', defVal);
					thisToolbar.setImageFilterText('gammaGreen', defVal);
					tbViewport.setImageFilterValuePrior('gammaGreen', defVal);
				}
				if (thisViewer.gammaBlueVisible) {
					setFilterReferences(null, 'gammaBlue', true);
					defVal = tbViewport.getImageFilterDefault('gammaBlue');
					thisToolbar.setImageFilterSlider('gammaBlue', defVal);
					thisToolbar.setImageFilterText('gammaBlue', defVal);
					tbViewport.setImageFilterValuePrior('gammaBlue', defVal);
				}
				if (thisViewer.hueVisible) {
					setFilterReferences(null, 'hue', true);
					defVal = tbViewport.getImageFilterDefault('hue');
					thisToolbar.setImageFilterSlider('hue', defVal);
					thisToolbar.setImageFilterText('hue', defVal);
					tbViewport.setImageFilterValuePrior('hue', defVal);
				}
				if (thisViewer.saturationVisible) {
					setFilterReferences(null, 'saturation', true);
					defVal = tbViewport.getImageFilterDefault('saturation');
					thisToolbar.setImageFilterSlider('saturation', defVal);
					thisToolbar.setImageFilterText('saturation', defVal);
					tbViewport.setImageFilterValuePrior('saturation', defVal);
				}
				if (thisViewer.lightnessVisible) {
					setFilterReferences(null, 'lightness', true);
					defVal = tbViewport.getImageFilterDefault('lightness');
					thisToolbar.setImageFilterSlider('lightness', defVal);
					thisToolbar.setImageFilterText('lightness', defVal);
					tbViewport.setImageFilterValuePrior('lightness', defVal);
				}			
				if (thisViewer.whiteBalanceVisible) {
					setFilterReferences(null, 'whiteBalance', true);
					defVal = tbViewport.getImageFilterDefault('whiteBalance');
					thisToolbar.setImageFilterSlider('whiteBalance', defVal);
					thisToolbar.setImageFilterText('whiteBalance', defVal);
					tbViewport.setImageFilterValuePrior('whiteBalance', defVal);
				}
				if (thisViewer.noiseVisible) {
					setFilterReferences(null, 'noise', true);
					defVal = tbViewport.getImageFilterDefault('noise');
					thisToolbar.setImageFilterSlider('noise', defVal);
					thisToolbar.setImageFilterText('noise', defVal);
					tbViewport.setImageFilterValuePrior('noise', defVal);
				}
				if (thisViewer.brightnessVisible) {
					setFilterReferences(null, 'brightness', true);
					defVal = tbViewport.getImageFilterDefault('brightness');
					thisToolbar.setImageFilterSlider('brightness', defVal);
					thisToolbar.setImageFilterText('brightness', defVal);
					tbViewport.setImageFilterValuePrior('brightness', defVal);
				}
			}
		}

		function show (value) {
			if ((thisViewer.toolbarVisible < 4 && !Z.mobileDevice) || thisViewer.toolbarVisible == 8 || thisViewer.toolbarInternal) {
				visibility(value);
			} else {
				minimize(!value);
			}
		}

		function visibility (visible) {
			if (tbS) {
				if (visible) {
					tbS.display = 'inline-block';
				} else {
					tbS.display = 'none';
				}
			}
		}

		function minimize (value) {
			thisViewer.ToolbarMinimized = value;
			if (tbS) {
				var bC = Z.Utils.getElementOfViewerById(zvIntID, 'buttonContainer');
				var bG = Z.Utils.getElementOfViewerById(zvIntID, 'toolbarBackground');
				var bM = Z.Utils.getElementOfViewerById(zvIntID, 'buttonMinimize');
				var bE = Z.Utils.getElementOfViewerById(zvIntID, 'buttonExpand');
				var logoD = Z.Utils.getElementOfViewerById(zvIntID, 'logoDivider');
				var minW = 0;
				if (bE && !overrideLogo) { minW = parseFloat(bE.style.left) + parseFloat(bE.style.width) + 4; }
				if (thisViewer.imageFilters) {
					var bGF = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterPanelBackground');
					var bCF = Z.Utils.getElementOfViewerById(zvIntID, 'buttonContainerImageFilter');
				}

				var expW = Z.toolbarCurrentW;
				if (value) {
					if (bC) { bC.style.display = 'none'; }
					if (bM && bE && !overrideLogo) {
						if (logoD) { logoD.style.display = 'none'; }
						bM.style.display = 'none';
						bE.style.display = 'inline-block';
					}
					tbS.width = minW + 'px';
					if (bG) { bG.style.width = minW + 'px'; }
					if (bGF && bCF) {
						bGF.style.width = '0px';
						bCF.style.display = 'none';
					}
				} else {
					if (bC) { bC.style.display = 'inline-block'; }
					if (bM && bE && !overrideLogo) {
						if (logoD) { logoD.style.display = 'inline-block'; }
						bM.style.display = 'inline-block';
						bE.style.display = 'none';
					}
					tbS.width = expW + 'px';
					if (bG) { bG.style.width = expW + 'px'; }
					if (bGF && bCF && imageFilterPanelVisible) {
						bGF.style.width = imageFilterPanelW + 'px';
						bCF.style.display = 'inline-block';
					}
				}
			}
		}

		this.syncSliderToViewportZoom = function (imageZ) {
			syncSliderToViewportZoom(imageZ);
		}

		function syncSliderToViewportZoom (imageZ) {			
			if (typeof trszS !== 'undefined' && typeof btszS !== 'undefined') {
				var imageSpan = thisViewer.maxZ - thisViewer.minZ;
				var sliderPercent = (imageZ - thisViewer.minZ) / imageSpan;
				var trackL = parseFloat(trszS.left);
				var trackR = parseFloat(trszS.left) + parseFloat(trszS.width) - parseFloat(btszS.width);
				var trackSpan = trackR - trackL;
				var sliderPosition = (sliderPercent * trackSpan) + trackL;
				btszS.left = sliderPosition + 'px';
			}
		}

		function sliderSnapZoom (event) {
			if (typeof trsZ !== 'undefined' && typeof trszS !== 'undefined') {
				var tszPt = Z.Utils.getElementPosition(trsZ);
				var sliderClick = Z.Utils.getMousePosition(event).x - tszPt.x;
				var sliderZoom = calculateSliderZoom(sliderClick, 0, parseFloat(trszS.width));

				if (sliderZoom < thisViewer.minZ + 0.1) { sliderZoom = thisViewer.minZ; }
				if (sliderZoom > thisViewer.maxZ - 0.1) { sliderZoom = thisViewer.maxZ; }

				var delta = sliderZoom - tbViewport.getZoom();
				thisViewer.zooming = (delta > 0) ? 'in' : (delta < 0) ? 'out' : 'stop';
				tbViewport.scaleTierToZoom(sliderZoom);
				thisViewer.zooming = 'stop';

				tbViewport.updateView();
			}
		}

		function sliderSlideStartZoom (event) {
			if (typeof btsZ !== 'undefined') {
				buttonSliderZoomDown = true;
				var mPt = Z.Utils.getMousePosition(event);
				btsZ.mouseXPrior = mPt.x;
				btsZ.mouseYPrior = mPt.y;
			}
		}

		function sliderSlideZoom () {
			if (typeof trszS !== 'undefined' && typeof btsZ !== 'undefined' && typeof btszS !== 'undefined') {
				var trackL = parseFloat(trszS.left);
				var trackR = parseFloat(trszS.left) + parseFloat(trszS.width) - parseFloat(btszS.width);
				var trackPosition = parseFloat(btszS.left) + (sliderIntervalMousePtZoom.x - btsZ.mouseXPrior);
				if (trackPosition < trackL) {
					trackPosition = trackL;
				} else if (trackPosition > trackR) {
					trackPosition = trackR;
				} else {
					btsZ.mouseXPrior = sliderIntervalMousePtZoom.x;
				}
				btszS.left = trackPosition + 'px';
				var sliderZoom = calculateSliderZoom(trackPosition, trackL, trackR);

				var delta = sliderZoom - tbViewport.getZoom();
				thisViewer.zooming = (delta > 0) ? 'in' : (delta < 0) ? 'out' : 'stop';

				tbViewport.scaleTierToZoom(sliderZoom);
			}
		}

		function sliderSlideEndZoom () {
			buttonSliderZoomDown = false;
			thisViewer.zooming = 'stop';			
			tbViewport.updateView();
		}

		function calculateSliderZoom (sliderPosition, trkL, trkR) {
			var trackSpan = trkR - trkL;
			var sliderPercent = (sliderPosition - trkL) / trackSpan;
			var imageSpan = thisViewer.maxZ - thisViewer.minZ;
			var sliderZoom = thisViewer.minZ + (imageSpan * sliderPercent);
			return sliderZoom;
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::::::::: EVENT FUNCTIONS :::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		// Handled simplified internal toolbar events.
		function buttonEventsHandlerInternal (event) {
			var event = Z.Utils.event(event);
			if (event) {
				var eventType = event.type;
				var eventTarget = Z.Utils.target(event);
				if (eventTarget) {
					buttonZoomOutInternalS.background = colorButtonInternalUp;
					buttonResetInternalS.background = colorButtonInternalUp;
					buttonZoomInInternalS.background = colorButtonInternalUp;
					var tbID = eventTarget.id;
					tbID = Z.Utils.stringSubtract(tbID, zvIntID);
					var isAltKey = event.altKey;
					switch(eventType) {
						case 'mouseover' :
							eventTarget.style.background = colorButtonInternalOver;
							break;
						case 'mousedown' :
							eventTarget.style.background = colorButtonInternalDown;
							if (tbID == 'buttonZoomInInternal') {
								if (!isAltKey) { tbViewport.zoom('in'); }
							} else if (tbID == 'buttonZoomOutInternal') {
								if (!isAltKey) { tbViewport.zoom('out'); }
							}
							break;
						case 'mouseup' :
							eventTarget.style.background = colorButtonInternalOver;
							tbViewport.zoom('stop');
							if (tbID == 'buttonResetInternal') { tbViewport.reset(isAltKey); }
							break;
						case 'mouseout' :
							break;
					}
				}
			}
		}

		this.buttonEventsHandler = function (event) {
			buttonEventsHandler(event);
		}

		// Handle all button events and graphic states by clearing all event handlers on exit
		// and resetting this handler as event broker. Prevent right mouse button use. Note that
		// call to setToolbarDefaults is redundant vs call by background mouseover handler
		// only if move slowly between buttons, not if move fast or if move directly off toolbar.
		function buttonEventsHandler (event) {			
			// Get needed values.
			var event = Z.Utils.event(event);
			if (event) {
				var eventType = event.type;
				var eventTarget = Z.Utils.target(event);
				if (eventTarget) {
					var targetBtn = eventTarget.parentNode;
					if (targetBtn) {				
						var targetBtnOrig = targetBtn;
						var tbID = targetBtn.id;			
						tbID = Z.Utils.stringSubtract(tbID, zvIntID);
					}
				}
				var relatedTarget = Z.Utils.relatedTarget(event);
			}

			// Prevent conflicting zoom-and-pan function calls and clear mask, if any.
			if (eventType == 'mousedown' && tbViewport && !(tbID == 'buttonAudioOn' || tbID == 'buttonAudioMuted')) {
				tbViewport.zoomAndPanAllStop(false, true);
				if (thisViewer.maskingSelection && thisViewer.maskClearOnUserAction) { tbViewport.clearMask(); }
			}

			// Prevent events if optional parameter set, or if due to choicelist navigation, right-click, or copy menu on mobile OS.
			if (!thisViewer.interactive && (eventType == 'mousedown' || eventType == 'mouseup') && (tbID != 'buttonRotateClockwise' && tbID != 'buttonRotateCounterwise')) { return; }
			if (relatedTarget && (relatedTarget == '[object HTMLSelectElement]' || relatedTarget == '[object HTMLOptionElement]')) { return; }
			if (Z.Utils.isRightMouseButton(event)) { return; }
			if (Z.touchSupport) { event.preventDefault(); }
		
			// If event firing on viewport if mouse dragged off slider button, reassign target to slider button to prevent buttonGraphicsUpdate function from setting visibility of viewport elements.
			if ((tbID && tbID.indexOf('viewportContainer') != -1) || buttonSliderZoomDown || buttonSliderFilterDown || buttonSliderImageSetDown || (tbID && tbID.indexOf('buttonSlider') != -1 && Z.viewerCounter > 1)) {
				if (tbID == 'buttonSliderZoom' || buttonSliderZoomDown) {
					btsZ = targetBtn = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderZoom');
					btszS = btsZ.style;
				} else if (tbID == 'buttonSliderImageSet' || buttonSliderImageSetDown) {
					btsiS = targetBtn = Z.Utils.getElementOfViewerById(zvIntID, 'buttonSliderImageSet');
					btsisS = btsiS.style;					
				}
				if (targetBtn && typeof targetBtn.id !== 'undefined') { 
					tbID = targetBtn.id;
					tbID = Z.Utils.stringSubtract(tbID, zvIntID);
				}
			}

			// Update button graphics.
			buttonGraphicsUpdate(targetBtn, eventType);

			// Handle events.
			if (tbID && tbID != 'buttonBackground' && eventType) {

				switch(eventType) {
					case 'click' :
						var isCheckbox = tbID.toLowerCase().indexOf('checkbox') != -1;
						if (tbViewport && isCheckbox) {
							buttonEventsManager(event, tbID);
						}
						break;
					case 'mouseover' :
						if (tbID != 'trackSliderZoom' && tbID != 'trackSliderImageSet') { // Slider track for image set will have mouse over and out event handlers for setting mousewheel focus.
							Z.Utils.removeEventListener(targetBtn.childNodes[0], 'mouseover', buttonEventsHandler);
							Z.Utils.addEventListener(targetBtn.childNodes[1], 'mousedown', buttonEventsHandler);
							Z.Utils.addEventListener(targetBtn.childNodes[1], 'mouseout', buttonEventsHandler);
							if (buttonSliderZoomDown && targetBtnOrig) { Z.Utils.addEventListener(targetBtnOrig.childNodes[0], 'mouseup', buttonEventsHandler); }
							if (buttonSliderImageSetDown && targetBtnOrig) { Z.Utils.addEventListener(targetBtnOrig.childNodes[0], 'mouseup', buttonEventsHandler); }
							if (tbID == 'buttonZoomIn' || tbID == 'buttonSliderZoom' || tbID == 'buttonZoomOut') {
								thisViewer.sliderFocus = 'zoom';
							} else if (tbID == 'buttonImageSetPrior' || tbID == 'buttonSliderImageSet' || tbID == 'buttonImageSetNext') {
								thisViewer.sliderFocus = 'imageSet';
							}
						} else {
							Z.Utils.addEventListener(targetBtn.childNodes[0], 'mouseout', buttonEventsHandler);
							thisViewer.sliderFocus = (tbID == 'trackSliderImageSet') ? 'imageSet' : 'zoom';
						}
						break;
					case 'mousedown' :
						thisViewer.buttonIsDown = true;								
						if (!thisViewer.fullView && document.activeElement) { document.activeElement.blur(); }
						if (tbID != 'trackSliderZoom' && tbID != 'trackSliderImageSet' && tbID.indexOf('trackSliderFilter') == -1) { // Sliders actions handled in event manager below.
							Z.Utils.removeEventListener(targetBtn.childNodes[1], 'mousedown', buttonEventsHandler);
							Z.Utils.removeEventListener(targetBtn.childNodes[1], 'mouseout', buttonEventsHandler);
							Z.Utils.addEventListener(targetBtn.childNodes[2], 'mouseup', buttonEventsHandler);
							Z.Utils.addEventListener(targetBtn.childNodes[2], 'mouseout', buttonEventsHandler);
							if (tbID == 'buttonSliderZoom') {
								sliderSlideStartZoom(event);
								sliderMouseMoveHandlerZoom(event); // Run once so values are defined at first movement.
								Z.Utils.addEventListener(document, 'mousemove', sliderMouseMoveHandlerZoom);
								if (!sliderIntervalZoom) { sliderIntervalZoom = window.setInterval(sliderSlideZoom, SLIDERTESTDURATION_ZOOM); }
								Z.Utils.addEventListener(document, 'mouseup', buttonEventsHandler);
							} else if (tbID.indexOf('buttonSliderFilter') != -1) {
								imageFilterEventsManager(event, tbID, 'sliderStart');
								sliderMouseMoveHandlerFilter(event, tbID); // Run once so values are defined at first movement.
								Z.Utils.addEventListener(document, 'mousemove', sliderMouseMoveHandlerFilter);
								if (!sliderIntervalFilter) { sliderIntervalFilter = window.setInterval( function() { imageFilterEventsManager(event, tbID, 'sliderSlide'); }, SLIDERTESTDURATION_FILTER); }
								Z.Utils.addEventListener(document, 'mouseup', buttonEventsHandler);
							} else if (tbID == 'buttonSliderImageSet') {
								sliderSlideStartImageSet(event);
								sliderMouseMoveHandlerImageSet(event); // Run once so values are defined at first movement.
								Z.Utils.addEventListener(document, 'mousemove', sliderMouseMoveHandlerImageSet);
								if (!sliderIntervalImageSet) { sliderIntervalImageSet = window.setInterval(sliderSlideImageSet, SLIDERTESTDURATION_IMAGESET); }
								Z.Utils.addEventListener(document, 'mouseup', buttonEventsHandler);
							}
						} else {
							Z.Utils.addEventListener(document, 'mouseup', buttonEventsHandler);
						}
						if (tbViewport) { buttonEventsManager(event, tbID); }
						break;
					case 'mouseup' :				
						thisViewer.buttonIsDown = false;
						if (tbID != 'trackSliderZoom' && tbID != 'trackSliderImageSet' && tbID.indexOf('trackSliderFilter') == -1) { // Sliders actions handled in event manager below.
							Z.Utils.removeEventListener(targetBtn.childNodes[2], 'mouseup', buttonEventsHandler);
							Z.Utils.removeEventListener(targetBtn.childNodes[2], 'mouseout', buttonEventsHandler);
							Z.Utils.addEventListener(targetBtn.childNodes[1], 'mousedown', buttonEventsHandler);
							Z.Utils.addEventListener(targetBtn.childNodes[1], 'mouseout', buttonEventsHandler);
							if (targetBtnOrig && (buttonSliderZoomDown || buttonSliderFilterDown || buttonSliderImageSetDown)) {
								Z.Utils.removeEventListener(targetBtnOrig.childNodes[0], 'mouseup', buttonEventsHandler);
							}
						} else {
							Z.Utils.addEventListener(document, 'mouseup', buttonEventsHandler);
						}
						if (tbViewport) { buttonEventsManager(event, tbID); }					
						break;
					case 'mouseout' :						
						if (tbID != 'trackSliderZoom' && tbID.indexOf('trackSliderFilter') == -1 && tbID != 'trackSliderImageSet') { // Slider track for image set will have mouse over and out event handlers for setting mousewheel focus.
							Z.Utils.removeEventListener(targetBtn.childNodes[1], 'mousedown', buttonEventsHandler);
							Z.Utils.removeEventListener(targetBtn.childNodes[1], 'mouseout', buttonEventsHandler);
							Z.Utils.addEventListener(targetBtn.childNodes[0], 'mouseover', buttonEventsHandler);
							if (tbViewport) { buttonEventsManager(event, tbID); }
							if (tbID == 'buttonImageSetPrior' || tbID == 'buttonSliderImageSet' || tbID == 'trackSliderImageSet' || tbID == 'buttonImageSetNext' || tbID == 'buttonZoomIn' || tbID == 'buttonSliderZoom' || tbID == 'buttonZoomOut') {
								thisViewer.sliderFocus = (thisViewer.mouseWheel == 2) ? 'imageSet' : 'zoom';
							}
						} else {
							Z.Utils.removeEventListener(targetBtn.childNodes[0], 'mouseout', buttonEventsHandler);
							thisViewer.sliderFocus = (thisViewer.mouseWheel == 2) ? 'imageSet' : 'zoom';
						}
						break;
					case 'touchstart' :
						if (tbID == 'buttonSliderZoom') {
							sliderSlideStartZoom(event);
							sliderTouchMoveHandlerZoom(event); // Run once so values are defined at first movement.
							Z.Utils.addEventListener(document, 'touchmove', sliderTouchMoveHandlerZoom);
							if (!sliderIntervalZoom) { sliderIntervalZoom = window.setInterval(sliderSlideZoom, SLIDERTESTDURATION_ZOOM); }
						} else if (tbID.indexOf('buttonSliderFilter') != -1) {
							imageFilterEventsManager(event, tbID, 'sliderStart');
							sliderTouchMoveHandlerFilter(event, tbID); // Run once so values are defined at first movement.
							Z.Utils.addEventListener(document, 'touchmove', sliderTouchMoveHandlerFilter);
							if (!sliderIntervalFilter) { sliderIntervalFilter = window.setInterval( function() { imageFilterEventsManager(event, tbID, 'sliderSlide'); }, SLIDERTESTDURATION_FILTER); }
						} else if (tbID == 'buttonSliderImageSet') {
							sliderSlideStartImageSet(event);
							sliderTouchMoveHandlerImageSet(event); // Run once so values are defined at first movement.
							Z.Utils.addEventListener(document, 'touchmove', sliderTouchMoveHandlerImageSet);
							if (!sliderIntervalImageSet) { sliderIntervalImageSet = window.setInterval(sliderSlideImageSet, SLIDERTESTDURATION_IMAGESET); }
						}
						Z.Utils.addEventListener(targetBtn, 'touchend', buttonEventsHandler);
						Z.Utils.addEventListener(targetBtn, 'touchcancel', buttonEventsHandler);
						if (tbViewport) { buttonEventsManager(event, tbID); }
						break;
					case 'touchend' :
						Z.Utils.addEventListener(targetBtn, 'touchstart', buttonEventsHandler);
						if (tbViewport) { buttonEventsManager(event, tbID); }
						break;
					case 'touchcancel' :
						Z.Utils.addEventListener(targetBtn, 'touchstart', buttonEventsHandler);
						if (tbViewport) { buttonEventsManager(event, tbID); }
						break;
					case 'MSPointerDown' :
						if (tbID == 'buttonSliderZoom') {
							sliderSlideStartZoom(event);
							sliderTouchMoveHandlerZoom(event); // Run once so values are defined at first movement.
							Z.Utils.addEventListener(document, 'MSPointerMove', sliderTouchMoveHandlerZoom);
							if (!sliderIntervalZoom) { sliderIntervalZoom = window.setInterval(sliderSlideZoom, SLIDERTESTDURATION_ZOOM); }
						} else if (tbID.indexOf('SliderFilter') != -1) {
							imageFilterEventsManager(event, tbID, 'sliderStart');
							sliderTouchMoveHandlerFilter(event, tbID); // Run once so values are defined at first movement.
							Z.Utils.addEventListener(document, 'MSPointerMove', sliderTouchMoveHandlerFilter);
							if (!sliderIntervalFilter) { sliderIntervalFilter = window.setInterval( function() { imageFilterEventsManager(event, tbID, 'sliderSlide'); }, SLIDERTESTDURATION_FILTER); }
						} else if (tbID == 'buttonSliderImageSet') {
							sliderSlideStartImageSet(event);
							sliderTouchMoveHandlerImageSet(event); // Run once so values are defined at first movement.
							Z.Utils.addEventListener(document, 'MSPointerMove', sliderTouchMoveHandlerImageSet);
							if (!sliderIntervalImageSet) { sliderIntervalImageSet = window.setInterval(sliderSlideImageSet, SLIDERTESTDURATION_IMAGESET); }
						}
						Z.Utils.addEventListener(targetBtn, 'MSPointerUp', buttonEventsHandler);
						if (tbViewport) { buttonEventsManager(event, tbID); }
						break;
					case 'MSPointerUp' :
						Z.Utils.addEventListener(targetBtn, 'MSPointerDown', buttonEventsHandler);
						if (tbViewport) { buttonEventsManager(event, tbID); }
						break;
				}
			}
		}

		function buttonEventsManager (event, tbID) {
			var eventType = event.type;
			//var tbID = Z.Utils.stringSubtract(tbID, zvIntID); // Value of zvIntID already subtracted from tbID by buttonEventsHandler.

			// Use vp ID 0 if one panel, or actual ID if many panels.
			var vp0MIDStr = (thisViewer.annotationFileShared) ? '0' : tbViewportIDStr;
			var isAltKey = event.altKey;
						
			if (eventType == 'click') {
				if (thisViewer.comparison && tbID.indexOf('Sync') != -1) {
					var eventTarget = Z.Utils.target(event);
					thisViewer.syncComparison = eventTarget.checked;
					thisViewer.syncComparisonViewport(true); // checkboxSyncComparison
				} else if (thisViewer.tracking && tbID.indexOf('Count') != -1) {
					tbViewport.trackingEventsManager(event, tbID); // checkboxCountersShow, checkboxCountingComplete
				} else if (thisViewer.userLogging && tbID.indexOf('User') != -1) {
					tbViewport.trackingEventsManager(event, tbID); // checkboxUserCountersShow
				} else if (thisViewer.imageFilters && tbID.indexOf('Filter') != -1) {
					imageFilterEventsManager(event, tbID, 'checkbox'); // checkboxFilterGrayscale, checkboxFilterThreshold, checkboxFilterInversion, checkboxFilterEqualize, checkboxFilterEdges, checkboxFilterSepia
				}
				// DEV NOTE: Review need for checkboxRollover dedicated handler.

			} else if (eventType == 'mousedown' || eventType == 'touchstart') {
				// Remove editing cursor from any current text region and position current edit mode indicator.
				textElementRemoveFocus();
				thisToolbar.positionButtonBorder(tbID);
				
				// DEV NOTE: Workaround for conflict between viewport ID and counter row ID suffixes.
				if (thisViewer.tracking && tbID.indexOf('buttonCounterListShow') != -1) {
					tbID = 'buttonCounterListShow';
				}
				
				switch (tbID) {
					case 'buttonMinimize' :
						if (isAltKey) {
							tbViewport.setHotspotsVisibility(!tbViewport.getHotspotsVisibility());
						} else {
							thisToolbar.minimize(true);
							if (thisViewer.Navigator) {
								thisViewer.Navigator.setVisibility(false);
								if (thisViewer.comparison) { thisViewer.Navigator2.setVisibility(false); }
							}
							if (thisViewer.Gallery) { thisViewer.Gallery.setVisibility(false); }
						}
						break;
					case 'buttonExpand' :
						if (isAltKey) {
							tbViewport.setHotspotsVisibility(!tbViewport.getHotspotsVisibility());
						} else {
							thisToolbar.minimize(false);
							if (thisViewer.Navigator) {
								thisViewer.Navigator.setVisibility(true);
								if (thisViewer.comparison) { thisViewer.Navigator2.setVisibility(true); }
							}
							if (thisViewer.Gallery) { thisViewer.Gallery.setVisibility(true); }
						}
						break;
					case 'buttonZoomOut' :
						if (!isAltKey) { tbViewport.zoom('out'); }
						break;

					case 'buttonZoomIn' :
						if (!isAltKey) { tbViewport.zoom('in'); }
						break;
					case 'buttonPanLeft' :
						tbViewport.pan('left');
						break;
					case 'buttonPanUp' :
						tbViewport.pan('up');
						break;
					case 'buttonPanDown' :
						tbViewport.pan('down');
						break;
					case 'buttonPanRight' :
						tbViewport.pan('right');
						break;
					case 'buttonReset' :
						tbViewport.reset(isAltKey);
						break;

					case 'buttonFullView' :
						// DEV NOTE: Function called on mouseup to avoid conflict with fullscreen mode change processing.
						//tbViewport.toggleFullViewMode(true);
						break;
					case 'buttonFullViewExit' :
						// DEV NOTE: Function called on mouseup to avoid conflict with fullscreen mode change processing.
						//tbViewport.toggleFullViewMode(false);
						break;

					case 'buttonMeasure' :
						tbViewport.toggleEditModeMeasure(true);
						break;
					case 'buttonMeasureExit' :
						tbViewport.toggleEditModeMeasure(false);
						break;

					case 'buttonHelp' :
						// Help is provided in five ways: viewer help for toolbar button, viewer help + annotation viewing help for toolbar button in annotation viewing mode,
						// markup editing help for markup button in markup editing mode, and annotation editing help for annotation panel button in annotation editing mode.
						// In addition, the zHelpPath parameter enables a fifth alternative, a custom help window.
						// This fifth option is managed within the showHelp function.
						if (thisViewer.annotations && thisViewer.editMode === null) {
							// Viewer help + annotation viewing help for toolbar button in annotation viewing mode.
							thisViewer.showHelp(Z.Utils.getResource('CONTENT_HELPTOOLBAR') + Z.Utils.getResource('CONTENT_HELPCONCATENATOR') + Z.Utils.getResource('CONTENT_HELPANNOTATIONVIEWING'));
						} else {
							// Viewer help for toolbar button.
							thisViewer.showHelp(Z.Utils.getResource('CONTENT_HELPTOOLBAR'));
						}
						break;
					case 'buttonHelpMarkup' + vp0MIDStr :
						// Markup editing help for markup button in markup editing mode.
						thisViewer.showHelp(Z.Utils.getResource('CONTENT_HELPMARKUP'));
						break;
					case 'buttonHelpAnnotation' + vp0MIDStr :
						// Annotation editing help for annotation panel button in annotation editing mode.
						thisViewer.showHelp(Z.Utils.getResource('CONTENT_HELPANNOTATIONEDITING'));
						break;

					case 'buttonRotateClockwise' :
						tbViewport.rotate('clockwise', isAltKey);
						break;
					case 'buttonRotateCounterwise' :
						tbViewport.rotate('counterwise', isAltKey);
						break;

					case 'buttonTourPrior' :
						tbViewport.priorDestination(true);
						break;
					case 'buttonTourNext' :
						tbViewport.nextDestination(true);
						break;
					case 'buttonTourStart' :
						tbViewport.tourStart();
						break;
					case 'buttonTourStop' :
						tbViewport.tourStop();
						break;

					case 'buttonSlideshowPrior' :
						tbViewport.priorSlide(true);
						break;
					case 'buttonSlideshowNext' :
						tbViewport.nextSlide(true);
						break;
					case 'buttonSlideshowStart' :
						tbViewport.slideshowStart();
						break;
					case 'buttonSlideshowStop' :
						tbViewport.slideshowStop();
						break;

					case 'buttonAudioOn' :
						tbViewport.audioMute(true);
						break;
					case 'buttonAudioMuted' :
						tbViewport.audioMute(false);
						break;

					case 'buttonImageFilterPanelShow' :
						thisToolbar.imageFilterPanelShow();
						break;
					case 'buttonImageFilterPanelHide' :
						thisToolbar.imageFilterPanelHide();
						break;
					case 'buttonImageFilterPanelHideOnPanel' :
						thisToolbar.imageFilterPanelHide();
						break;

					case 'buttonImageSetPrior' :
						// Handle here if animation, on mouseup if slidestack.
						if (thisViewer.animation) { thisViewer.viewportChange('backward'); }
						break;
					case 'buttonImageSetNext' :
						// Handle here if animation, on mouseup if slidestack.
						if (thisViewer.animation) { thisViewer.viewportChange('forward'); }
						break;

					case 'buttonPreload' :
						if (thisViewer.imageSet) {
							thisViewer.preloadTiles();
						} else {
							thisViewer.Viewport.preloadTiles();
						}
						break;

					case 'buttonPOIGo' + vp0MIDStr :
						tbViewport.goToPOICurrent();
						break;
					case 'buttonPOIAdd' + vp0MIDStr :
						tbViewport.addNewPOI();
						break;
					case 'buttonPOIEdit' + vp0MIDStr :
						tbViewport.editCurrentPOI();
						break;
					case 'buttonPOIDelete' + vp0MIDStr :
						tbViewport.deleteCurrentPOI();
						break;
					case 'buttonPOICancel' + vp0MIDStr :
						tbViewport.cancelEditsPOI();
						break;
					case 'buttonPOISave' + vp0MIDStr :
						tbViewport.saveEditsPOI();
						break;
					case 'buttonLabelGo' + vp0MIDStr :
						tbViewport.goToLabelCurrent();
						break;
					case 'buttonLabelAdd' + vp0MIDStr :
						tbViewport.addNewLabel();
						break;
					case 'buttonLabelEdit' + vp0MIDStr :
						tbViewport.editCurrentLabel();
						break;
					case 'buttonLabelDelete' + vp0MIDStr :
						tbViewport.deleteCurrentLabel();
						break;
					case 'buttonLabelCancel' + vp0MIDStr :
						tbViewport.cancelEditsLabel();
						break;
					case 'buttonLabelSave' + vp0MIDStr :
						tbViewport.saveEditsLabel(false, true, true); // Parameters are continueEditing, saveForce, saveImage.
						break;
					case 'buttonNoteAdd' + vp0MIDStr :
						tbViewport.addNewNote();
						break;
					case 'buttonNoteEdit' + vp0MIDStr :
						tbViewport.editCurrentNote();
						break;
					case 'buttonNoteDelete' + vp0MIDStr :
						tbViewport.deleteCurrentNote();
						break;
					case 'buttonNoteCancel' + vp0MIDStr :
						tbViewport.cancelEditsNote();
						break;
					case 'buttonNoteSave' + vp0MIDStr :
						tbViewport.saveEditsNote();
						break;

					case 'buttonClearAll' + vp0MIDStr :
						// Debug option:
						//tbViewport.testSetAnnotationPath();
						tbViewport.deleteAllAnnotations();
						break;

					case 'buttonViewMode' + vp0MIDStr :
						tbViewport.setEditModeLabel('view');
						break;
					case 'buttonEditColorPicker' + vp0MIDStr :
						tbViewport.toggleLabelColorPicker();
						break;
					case 'buttonEditModeFreehand' + vp0MIDStr :
						tbViewport.setEditModeLabel('freehand');
						break;
					case 'buttonEditModeText' + vp0MIDStr :
						tbViewport.setEditModeLabel('text');
						break;
					case 'buttonEditModeIcon' + vp0MIDStr :
						tbViewport.setEditModeLabel('icon');
						break;
					case 'buttonEditModeRectangle' + vp0MIDStr :
						tbViewport.setEditModeLabel('rectangle');
						break;
					case 'buttonEditModePolygon' + vp0MIDStr :
						tbViewport.setEditModeLabel('polygon');
						break;
					case 'buttonEditModeMeasure' + vp0MIDStr :
						tbViewport.setEditModeLabel('measure');
						break;

					case 'buttonLabelScaleDown' + vp0MIDStr :
						tbViewport.labelScale('down');
						break;
					case 'buttonLabelScaleUp' + vp0MIDStr :
						tbViewport.labelScale('up');
						break;

					case 'buttonCounterListShow' :
						tbViewport.trackingEventsManager(event, tbID);
						break;
					case 'buttonCounterListHide' + vp0MIDStr :
						tbViewport.trackingEventsManager(event, tbID);
						break;
					case 'buttonToggleTrackingNav' + vp0MIDStr :
						tbViewport.trackingEventsManager(event, tbID);
						break;
					case 'buttonTrackingClearLast' + vp0MIDStr :
						tbViewport.trackingEventsManager(event, tbID);
						break;
					case 'buttonTrackingClearType' + vp0MIDStr :
						tbViewport.trackingEventsManager(event, tbID);
						break;
					case 'buttonTrackingClearAll' + vp0MIDStr :
						tbViewport.trackingEventsManager(event, tbID);
						break;
					case 'buttonTrackingSave' + vp0MIDStr :
						tbViewport.trackingEventsManager(event, tbID);
						break;

					default :
						if (tbID.substr(0, 11) == 'buttonColor') {
							tbViewport.setDrawingColor(tbID);
						}
				}

			} else if (eventType == 'mouseup' || eventType == 'touchend' || eventType == 'touchcancel') {
				if (tbID == 'buttonSliderZoom' || buttonSliderZoomDown) {
					if (sliderIntervalZoom) {
						window.clearInterval(sliderIntervalZoom);
						sliderIntervalZoom = null;
					}
					setToolbarDefaults();
					sliderSlideEndZoom();
				} else if (tbID == 'trackSliderZoom') {
					sliderSnapZoom(event);
				} else if (tbID.indexOf('buttonSliderFilter') != -1 || buttonSliderFilterDown) {
					if (sliderIntervalFilter) {
						window.clearInterval(sliderIntervalFilter);
						sliderIntervalFilter = null;
					}
					setToolbarDefaults();
					imageFilterEventsManager(event, tbID, 'sliderEnd');
				} else if (tbID.indexOf('trackSliderFilter') != -1) {
					imageFilterEventsManager(event, tbID, 'sliderSnap');
				} else if (tbID == 'buttonImageFilterPlus' || tbID == 'buttonImageFilterMinus') {
					imageFilterEventsManager(event, tbID);
				} else if (tbID == 'buttonSliderImageSet' || buttonSliderImageSetDown) {
					if (sliderIntervalImageSet) {
						window.clearInterval(sliderIntervalImageSet);
						sliderIntervalImageSet = null;
					}
					setToolbarDefaults();
					sliderSlideEndImageSet();
				} else if (tbID == 'buttonZoomOut' || tbID == 'buttonZoomIn') {
					tbViewport.zoom('stop');
					// Optional means to toggle smooth zoom off and on.
					if (tbID == 'buttonZoomOut' && isAltKey) { tbViewport.toggleSmoothZoom(); }
					// Optional means to toggle between edit and view modes.
					if (tbID == 'buttonZoomIn' && isAltKey) { tbViewport.toggleEditMode(); }
				} else if (tbID == 'buttonPanLeft' || tbID == 'buttonPanRight') {
					if (!thisViewer.tracking) {
						tbViewport.pan('horizontalStop');
					} else {
						if (tbID == 'buttonPanLeft') {
							thisViewer.viewportCurrent.goToNextCell('left');
						} else {
							thisViewer.viewportCurrent.goToNextCell('right');
						}
					}
					// Optional means to toggle smooth pan off and on.
					if (tbID == 'buttonPanLeft' && isAltKey) { tbViewport.toggleSmoothPan(); }
				} else if (tbID == 'buttonPanUp' || tbID == 'buttonPanDown') {
					if (!thisViewer.tracking) {
						tbViewport.pan('verticalStop');
					} else {
						if (tbID == 'buttonPanUp' ) {
							thisViewer.viewportCurrent.goToNextCell('up');
						} else {
							thisViewer.viewportCurrent.goToNextCell('down');
						}
					}
				} else if (tbID == 'buttonHelp') {
					// Optional means to display Viewer global variable values when debug parameter is not set in web page.
					if (thisViewer.debug == 0 && isAltKey) { thisViewer.showGlobals(); }
				} else if (tbID == 'buttonRotateClockwise' || tbID == 'buttonRotateCounterwise') {
					if (thisViewer.rotationFree) { tbViewport.rotate('stop'); }
				} else if (tbID == 'buttonLabelScaleDown' + vp0MIDStr || tbID == 'buttonLabelScaleUp' + vp0MIDStr) {
					tbViewport.labelScale('stop');
				} else if (tbID == 'buttonFullView') {
					// DEV NOTE: Function called on mouseup to avoid conflict with fullscreen mode change processing.
					tbViewport.toggleFullViewMode(true);
				} else if (tbID == 'buttonFullViewExit') {
					// DEV NOTE: Function called on mouseup to avoid conflict with fullscreen mode change processing.
					tbViewport.toggleFullViewMode(false);
				} else if (tbID == 'buttonImageFilterClear') {
					tbViewport.clearImageFilterLast();
				} else if (tbID == 'buttonImageFiltersClearAll') {
					tbViewport.clearImageFiltersAll();
				} else if (tbID == 'trackSliderImageSet') {
					if (thisViewer.slidestack) { sliderSnapImageSet(event); }
				} else if (tbID == 'buttonImageSetPrior' || tbID == 'buttonImageSetNext') {
					if (thisViewer.animation) {
						thisViewer.viewportChange('stop');
					} else if (thisViewer.slidestack) {
						if (tbID == 'buttonImageSetPrior') {
							thisViewer.viewportChange('backward');
						} else if (tbID == 'buttonImageSetNext') {
							thisViewer.viewportChange('forward');
						}
					}
				}

			} else if (eventType == 'mouseout') {
				if (tbID == 'buttonZoomOut' || tbID == 'buttonZoomIn') {
					tbViewport.zoom('stop');
				} else if (tbID == 'buttonPanLeft' || tbID == 'buttonPanRight') {
					tbViewport.pan('horizontalStop');
				} else if (tbID == 'buttonPanUp' || tbID == 'buttonPanDown') {
					tbViewport.pan('verticalStop');
				} else if (tbID == 'buttonLabelScaleDown' + vp0MIDStr || tbID == 'buttonLabelScaleUp' + vp0MIDStr) {
					tbViewport.labelScale('stop');
				} else if (tbID == 'buttonImageSetPrior' || tbID == 'buttonImageSetNext') {
					thisViewer.viewportChange('stop');
				}
			}
		}

		this.backgroundEventsHandler = function (event) {
			// Background mouseover event is backup for mouseout of buttons.
			var event = Z.Utils.event(event);
			var relatedTarget = Z.Utils.relatedTarget(event);
			if (relatedTarget) {
				var targetBtn = relatedTarget.parentNode;
				if (targetBtn) {
					var tbID = targetBtn.id;
					if (tbID) {
						if (!buttonSliderZoomDown && !buttonSliderFilterDown && !buttonSliderImageSetDown && tbID.indexOf('button') != -1 && tbID.indexOf('buttonContainer') == -1) {
							Z.Utils.setButtonDefaults(relatedTarget.parentNode, thisToolbar);
						}
					}
				}
			}
		}

		function setToolbarDefaults () {
			if (buttonSliderZoomDown) {
				Z.Utils.removeEventListener(document, 'mousemove', sliderMouseMoveHandlerZoom);
				Z.Utils.removeEventListener(document, 'mouseup', buttonEventsHandler);
				Z.Utils.removeEventListener(document, 'touchmove', sliderTouchMoveHandlerZoom);
			} else if (buttonSliderFilterDown) {
				Z.Utils.removeEventListener(document, 'mousemove', sliderMouseMoveHandlerFilter);
				Z.Utils.removeEventListener(document, 'mouseup', buttonEventsHandler);
				Z.Utils.removeEventListener(document, 'touchmove', sliderTouchMoveHandlerFilter);
			} else if (buttonSliderImageSetDown) {
				Z.Utils.removeEventListener(document, 'mousemove', sliderMouseMoveHandlerImageSet);
				Z.Utils.removeEventListener(document, 'mouseup', buttonEventsHandler);
				Z.Utils.removeEventListener(document, 'touchmove', sliderTouchMoveHandlerImageSet);
			}
			var toolbarChildren = thisViewer.ToolbarDisplay.childNodes;
			for (var i = 0, j = toolbarChildren.length; i < j; i++) {
				var target = toolbarChildren[i];
				var tID = target.id;
				if (tID && tID.indexOf('button') != -1) {
					if (tID != 'buttonContainer' && tID != 'buttonContainerImageFilter') {
						Z.Utils.setButtonDefaults(target, thisToolbar);
					} else {
						var targetChildren = target.childNodes;
						for (var k = 0, m = targetChildren.length; k < m; k++) {
							var targetSub = targetChildren[k];
							var tIDS = targetSub.id;
							if (tIDS && tIDS.indexOf('button') != -1) {
								Z.Utils.setButtonDefaults(targetSub, thisToolbar);
							}
						}
					}
				}
			}
		}

		function sliderMouseMoveHandlerZoom (event) {
			sliderIntervalMousePtZoom = new Z.Utils.Point(event.clientX, event.clientY);
		}

		function sliderTouchMoveHandlerZoom (event) {
			var touch = Z.Utils.getFirstTouch(event);
			if (touch) {
				var target = touch.target;
				sliderIntervalMousePtZoom = new Z.Utils.Point(touch.pageX, touch.pageY);
			}
		}

		function buttonGraphicsUpdate (targetBtn, eT) {			
			if (typeof targetBtn.id !== 'undefined' && targetBtn.id.indexOf('button') != -1 && targetBtn.id.indexOf('buttonContainer') == -1) {
				var iU = targetBtn.firstChild;
				var iO = targetBtn.childNodes[1];
				var iD = targetBtn.childNodes[2];
				if (iU && iO && iD) {
					var iuS = iU.style;
					var ioS = iO.style;
					var idS = iD.style;
					iuS.visibility = ioS.visibility = idS.visibility = 'hidden';
					// First line assigns priority to slider button mousedown state over mouse out/over/up events of other buttons.
					if (eT == 'mouseover' && targetBtn.id.indexOf('buttonSliderZoom') != -1 && buttonSliderZoomDown) {
						idS.visibility = 'visible';
					} else if (eT == 'mouseover' && targetBtn.id.indexOf('buttonSliderFilter') != -1 && buttonSliderFilterDown) {
						idS.visibility = 'visible';
					} else if (eT == 'mouseover' && targetBtn.id.indexOf('buttonSliderImageSet') != -1 && buttonSliderImageSetDown) {
						idS.visibility = 'visible';
					} else if (eT == 'mouseover' || eT == 'mouseup') {
						ioS.visibility = 'visible';
					} else if (eT == 'mousedown' || eT == 'mousemove' || eT == 'touchstart' || eT == 'MSPointerDown') {
						idS.visibility = 'visible';
					} else if (eT == 'mouseout' || eT == 'touchend' || eT == 'touchcancel' || eT == 'MSPointerUp') {
						iuS.visibility = 'visible';
					}
				}
			}
		}

		function textElementRemoveFocus () {
			var elmt = document.activeElement.id;
			if (Z.Utils.stringValidate(elmt) && (elmt == 'poiNameTextElement' + tbViewportIDStr || elmt == 'labelNameTextElement' + tbViewportIDStr || elmt == 'captionTextElement' || elmt == 'commentTextElement' || elmt == 'tooltipTextElement' || elmt == 'clickURLTextElement' || elmt == 'noteNameTextElement' + tbViewportIDStr || elmt == 'noteTextElement' + tbViewportIDStr)) {
				var currentTextRegion = Z.Utils.getElementOfViewerById(zvIntID, elmt);
				currentTextRegion.blur();
			}
		}

		this.positionButtonBorder = function (tbID) {
			tbID = Z.Utils.stringSubtract(tbID, zvIntID);
			
			// Use vp ID 0 if one panel, or actual ID if many panels.
			var vp0MIDStr = (thisViewer.annotationFileShared) ? '0' : tbViewportIDStr;

			// Position button border large around buttonViewMode, buttonEditModeFreehand, buttonEditModeRectangle,
			// or buttonModePolygon, or position button border small around clicked color button.
			if (tbID.substr(0, 11) == 'buttonColor') {
				var btnBrdr = Z.Utils.getElementOfViewerById(zvIntID, 'buttonBorderSm' + vp0MIDStr);
			} else {
				if (tbID == 'buttonViewMode' + vp0MIDStr || tbID == 'buttonEditModeFreehand' + vp0MIDStr || tbID == 'buttonEditModeText' + vp0MIDStr ||  tbID == 'buttonEditModeIcon' + vp0MIDStr || tbID == 'buttonEditModeRectangle' + vp0MIDStr || tbID == 'buttonEditModePolygon' + vp0MIDStr || tbID == 'buttonEditModeMeasure' + vp0MIDStr) {
					var btnBrdr = Z.Utils.getElementOfViewerById(zvIntID, 'buttonBorderLg' + vp0MIDStr);
				}
			}
			var tgtBtn = Z.Utils.getElementOfViewerById(zvIntID, tbID);
			if (btnBrdr && tgtBtn) {
				if (tbID == 'buttonClearAll' + vp0MIDStr) { tgtBtn = Z.Utils.getElementOfViewerById(zvIntID, 'buttonViewMode' + tbViewportID); }
				var btnBrdrS = btnBrdr.style;
				var tgtBtnS = tgtBtn.style;
				btnBrdrS.left = parseFloat(tgtBtnS.left) - 2 + 'px';
				btnBrdrS.top = parseFloat(tgtBtnS.top) - 2 + 'px';
			}
		}

		this.imageFilterPanelShow = function () {
			// Show panel, show Hide button, hide Show button.
			var bGF = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterPanelBackground');
			var bCF = Z.Utils.getElementOfViewerById(zvIntID, 'buttonContainerImageFilter');
			var bFPS = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFilterPanelShow');
			var bFPH = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFilterPanelHide');
			if (bGF && bCF && bFPS && bFPH) {
				bGF.style.width = imageFilterPanelW + 'px';
				bCF.style.display = 'inline-block';
				bFPS.style.display = 'none';
				bFPH.style.display = 'inline-block';
			}
			imageFilterPanelVisible = true;
		}

		this.imageFilterPanelHide = function () {
			// Hide panel, hide Hide button, show Show button.
			var bGF = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterPanelBackground');
			var bCF = Z.Utils.getElementOfViewerById(zvIntID, 'buttonContainerImageFilter');
			var bFPS = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFilterPanelShow');
			var bFPH = Z.Utils.getElementOfViewerById(zvIntID, 'buttonImageFilterPanelHide');
			if (bGF && bCF && bFPS && bFPH) {
				bGF.style.width = '0px';
				bCF.style.display = 'none';
				bFPS.style.display = 'inline-block';
				bFPH.style.display = 'none';
			}
			imageFilterPanelVisible = false;
		}

		function imageFilterListChangeHandler (event) {
			var event = Z.Utils.event(event);
			if (event) {
				var target = Z.Utils.target(event);

				// Prior implementation used list to select filter as target of buttons. Current implementation
				// presents slider for each filter and uses list to display filter history. This function is not used.
				target.selectedIndex = 0;
			}
		}

		this.addFilterToImageFilterList = function (imgFltrSel, filterValue, filterValue2, modifyPrior) {
			var cliF = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterList');
			if (cliF) {
				var imgFltrSelFirstUpper = Z.Utils.stringUpperCaseFirstLetter(imgFltrSel);
				var filterPriorIndex = Z.Utils.arrayIndexOfObjectValueSubstring(cliF.options, 'text', imgFltrSelFirstUpper);
				var filterName = '\u00A0\u00A0' + imgFltrSelFirstUpper;

				// Remove 'None' if present.
				if (cliF.options[cliF.options.length - 1].text == '\u00A0\u00A0None') { cliF.options.remove(cliF.options.length - 1); }

				// Calculate filter rounded value if value provided.
				var valueRoundedStr = '';
				if (typeof filterValue !== 'undefined' && filterValue !== null) {
					valueRoundedStr = Z.Utils.roundToFixed(filterValue, 3).toString();
				}

				// Calculate filter rounded second value if provided (used only for RGB range filters).
				var value2RoundedStr = '';
				if (typeof filterValue2 !== 'undefined' && filterValue2 !== null) {
					value2RoundedStr = '-' + Z.Utils.roundToFixed(filterValue2, 3).toString();
				}

				// Add new filter name and amount or modify amount of ANY existing entry of current filter type.
				// DEV NOTE: This is a change from prior implementation to be consistent with user intuition and - 
				// for example, based on PS behavior - which sees filter use instances as non-discrete / non-ordered.
				// Exception to be addressed in future release: sharpen and blur (PS implements in discreet selections from menu).
				if (modifyPrior) {
					var currentEntry = cliF.options[filterPriorIndex].text;
					var currentEntryPreAmount = currentEntry.substring(0, currentEntry.indexOf(':\u00A0\u00A0') + 3);
					cliF.options[filterPriorIndex].text = currentEntryPreAmount + valueRoundedStr + value2RoundedStr;
				} else if (cliF.options[cliF.options.length - 1].text.toLowerCase().indexOf(imgFltrSel.toLowerCase()) == -1) {
					cliF.options[cliF.options.length] = new Option(filterName, imgFltrSel);
					if (Z.Utils.stringValidate(valueRoundedStr)) {
						cliF.options[cliF.options.length - 1].text += ':\u00A0\u00A0' + valueRoundedStr + value2RoundedStr;
					}
				} else {
					var currentEntry = cliF.options[cliF.options.length - 1].text;
					var currentEntryPreAmount = currentEntry.substring(0, currentEntry.indexOf(':\u00A0\u00A0') + 3);
					cliF.options[cliF.options.length - 1].text = currentEntryPreAmount + valueRoundedStr + value2RoundedStr;
				}
			}
		}

		function removeFilterFromImageFilterList (imgFltrSel, last) {
			var cliF = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterList');
			if (cliF) {
				// Remove filter name from history.
				var index = (last) ? cliF.options.length - 1 : Z.Utils.arrayIndexOfObjectValue(cliF.options, 'value', imgFltrSel);
				if (index != -1) {
					cliF.options.remove(index);
					// Consolidate matching sequential filters.
					if ((cliF.options.length > index) && (cliF.options[index].value == cliF.options[index - 1].value)) {
						var string1 = cliF.options[index - 1].text;
						var string2 = cliF.options[index].text;
						var filterName = string1.substring(0, string1.indexOf(':\u00A0\u00A0') + 2);
						var substring1 = string2.substring(string2.indexOf(':\u00A0\u00A0') + 3, string2.length);
						var substring2 = string2.substring(string2.indexOf(':\u00A0\u00A0') + 3, string2.length);
						var sumValue = parseFloat(substring2) + parseFloat(substring1);
						cliF.options[index - 1].text = filterName + sumValue.toString();
						cliF.options.remove(index);
					}
				}

				// Restore 'None' item if not present and history is empty.
				if (cliF.options.length == 2) { cliF.options[cliF.options.length] = new Option('\u00A0\u00A0None', 'null'); }
			}
		}

		function removeAllFiltersFromImageFilterList () {
			var cliF = Z.Utils.getElementOfViewerById(zvIntID, 'imageFilterList');
			if (cliF) {
				cliF.options.length = 0;
				for (var i = 0, j = imageFilterListDP.length; i < j; i++) {
					cliF.options[cliF.options.length] = new Option(imageFilterListDP[i].text, imageFilterListDP[i].value);
				}
			}
		}
	};



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::: NAVIGATOR FUNCTIONS :::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.ZoomifyNavigator = function (navViewport) {

		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::: INIT FUNCTIONS ::::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		// Declare variables for navigator internal self-reference and initialization completion.
		var thisNavigator = this;
		var isInitialized = false;
		var navViewportIDStr = navViewport.getViewportID().toString();
		var validateNavigatorGlobalsInterval;

		// Declare variables for navigator display.
		var navigatorDisplay;
		var nD, ndS, nB, nbS, niC, nicS, nI, nR, nrS;
		var navigatorImage;
		var navigatorImages = [];
		var MOUSECLICK_THRESHOLD_NAVIGATOR = parseInt(Z.Utils.getResource('DEFAULT_MOUSECLICKTHRESHOLDNAVIGATOR'), 10);
		var TOUCHTAP_THRESHOLD_NAVIGATOR = (Z.mobileDevice) ? parseInt(Z.Utils.getResource('DEFAULT_TOUCHTAPTHRESHOLDNAVIGATORMOBILE'), 10) : parseInt(Z.Utils.getResource('DEFAULT_TOUCHTAPTHRESHOLDNAVIGATOR'), 10);

		// Declare and set variables local to navigator for size and position.
		var navW = thisViewer.navigatorW;
		var navH = thisViewer.navigatorH;
		var navL = thisViewer.navigatorL;
		var navT = thisViewer.navigatorT;
		var navFit = thisViewer.navigatorFit;
		var navImageW, navImageH = null;

		if (thisViewer.comparison && navViewportIDStr == '1') { navL = thisViewer.viewerW - navW - 1; }

		// Load Zoomify Image thumbnail.
		var navigatorImagePath;

		// Support imageSet viewing.
		if (thisViewer.imagePath != "multiple" || thisViewer.comparison || (thisViewer.overlays && navViewport.getViewportID() == '0')) {
			loadNavigatorImage(initializeNavigator);
		} else {
			loadNavigatorImagesMultiple(initializeNavigatorMultipleViewports);
		}

		// Support imageSet viewing.
		function loadNavigatorImagesMultiple (successFunction) {
			for (var i = 0, j = thisViewer.imageSetLength; i < j; i++) {
				loadNavigatorImage(null, thisViewer['Viewport' + i.toString()]); // Pass in null success function.
			}
			successFunction(); // initializeNavigatorMultipleViewports // Call success function explicitly.
		}

		function loadNavigatorImage (successFunction, multiViewport) {
			var oneVP = (typeof multiViewport !== "undefined" && multiViewport !== null) ? false : true;
			var navVP = (oneVP) ? navViewport : multiViewport;

			if (thisViewer.tileSource != 'unconverted') {

				if (thisViewer.tileSource == 'ZoomifyImageFolder') {
					navigatorImagePath = Z.Utils.cacheProofPath(navVP.getImagePath() + '/TileGroup0/' + '0-0-0.' + thisViewer.tileType);
				} else {
					navigatorImagePath = navVP.formatTilePath(0, 0, 0);
				}			
				navigatorImage = null;
				navigatorImage = new Image();
				navigatorImage.onload = successFunction;
				navigatorImage.onerror = navigatorImageLoadingFailed;

				if (navigatorImagePath != 'offsetLoading') {
					if (!oneVP) {
						navigatorImages[navigatorImages.length] = { id:multiViewport.getViewportID().toString(), image:navigatorImage };
					}

					if (thisViewer.tileSource != 'ZoomifyZIFFile' && thisViewer.tileSource != 'ZoomifyPFFFile' ) {
						navigatorImage.src = navigatorImagePath;			
					} else{
						var navNetConnector = new Z.NetConnector(thisViewer);
						var vpID = navVP.getViewportID();
						// Success function is initializeNavigatorMultipleViewports.
						navNetConnector.loadImage(navigatorImagePath, Z.Utils.createCallback(null, successFunction), 'navigator', null, vpID);
					}

				} else {
					var navigatorImageTimer = window.setTimeout( function () { loadNavigatorImage(successFunction); }, 100);
				}

			} else {
				var unconvertedImage = navVP.getUnconvertedImage();
				if (typeof unconvertedImage !== 'undefined' && unconvertedImage !== null) {
					// Unconverted image: create navigator thumbnail.
					navigatorImage = navVP.createUnconvertedImageThumbnail(unconvertedImage);

					// Initialize navigator if single viewport. If multiple, store thumbnail for one call to initialize in function loadNavigatorImagesMultiple outside for loop that calls this function loadNavigatorImage.
					if (oneVP && typeof successFunction === 'function') {
						successFunction(); // initializeNavigator(placeholder, image)
					} else {
						if (typeof multiViewport !== 'undefined') {
							navigatorImages[navigatorImages.length] = { id:multiViewport.getViewportID().toString(), image:navigatorImage };
						} else {
							// DEV NOTE: Placeholder workaround for browser issue under investigation.
							navigatorImages[navigatorImages.length] = { id:null, image:null };
						}
					}
				} else {
					var loadNavigatorImageTimer = window.setTimeout( function () { loadNavigatorImage(successFunction, multiViewport); }, 100);
				}
			}
		}

		this.initializeNavigator = function (placeholder, image) {
			initializeNavigator(placeholder, image);
		}

		function initializeNavigator (placeholder, image) {
			// Navigator thumbnail will be received in loadNavigatorImage function via navigator.src assignment,
			// unless tileSource is ZIF or PFF file without use of servlet, in which case thumbnail will 
			// be received via image parameter of this function serving as success function for loadNavigatorImage function.
			if (thisViewer.tileSource == 'ZoomifyZIFFile' || (thisViewer.tileSource == 'ZoomifyPFFFile' && thisViewer.tileHandlerPathFull === null)) { navigatorImage = image; }

			// Verify image load completion.
			var testImageContainer = Z.Utils.createContainerElement(zvIntID, 'div', 'testImageContainer', 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', null, true);
			testImageContainer.appendChild(navigatorImage);
			testImageContainer.removeChild(navigatorImage);
			testImageContainer = null;
			var tW = navigatorImage.width;
			var tH = navigatorImage.height;
			if (tW != 0 && tH != 0) {

				// Create navigator display to contain background, image, and rectangle.
				navigatorDisplay = Z.Utils.createContainerElement(zvIntID, 'div', 'navigatorDisplay' + navViewportIDStr, 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', navL + 'px', navT + 'px', 'solid', '1px', 'transparent none', '0px', '0px', 'normal', null, true);
				thisViewer.NavigatorDisplay = navigatorDisplay; // Global reference for rapid opacity setting from Viewer - not necessary for second Navigator as no dual-navigator slideshows.
				nD = navigatorDisplay;
				ndS = nD.style;
				if (thisViewer.slideshow) { Z.Utils.setOpacity(thisViewer.NavigatorDisplay, 0); }

				// Ensure proper z-ordering of Viewer elements.
				ndS.zIndex = (thisViewer.baseZIndex + 4).toString();

				// Create background and set transparency.
				var backAlpha = parseFloat(Z.Utils.getResource('DEFAULT_BACKGROUNDALPHA'));
				var backColor = Z.Utils.getResource('DEFAULT_BACKGROUNDCOLOR');
				var backColorNoAlpha = Z.Utils.getResource('DEFAULT_BACKGROUNDCOLORNOALPHA');
				var navigatorBackground = Z.Utils.createContainerElement(zvIntID, 'div', 'navigatorBackground', 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', '0px', '0px', 'none', '0px', backColor, '0px', '0px', 'normal', null, true);
				Z.Utils.setOpacity(navigatorBackground, backAlpha, backColorNoAlpha);
				navigatorDisplay.appendChild(navigatorBackground);
				nB = navigatorBackground;
				nbS = nB.style;

				// Add thumbnail image previously loaded.
				var navigatorImageContainer = Z.Utils.createContainerElement(zvIntID, 'div', 'navigatorImageContainer', 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'normal', null, true);
				navigatorImageContainer.appendChild(navigatorImage);
				navigatorImage.alt = Z.Utils.getResource('UI_NAVIGATORACCESSIBILITYALTATTRIBUTE');
				navigatorDisplay.appendChild(navigatorImageContainer);
				niC = navigatorImageContainer;
				nicS = niC.style;
				nI = navigatorImage;
				var niW = nI.width;
				var niH = nI.height;

				// Create rectangle to indicate position within image of current viewport view.
				var navigatorRectangle = Z.Utils.createContainerElement(zvIntID, 'div', 'navigatorRectangle', 'inline-block', 'absolute', 'hidden', navW+1 + 'px', navH+1 + 'px', navL + 'px', navT + 'px', 'solid', '1px', 'transparent none', '0px', '0px', 'normal', null, true);
				navigatorRectangle.style.borderColor = Z.Utils.stringValidateColorValue(thisViewer.navigatorRectangleColor);
				navigatorDisplay.appendChild(navigatorRectangle);
				nR = navigatorRectangle;
				nrS = nR.style;

				if (thisViewer.comparison) {
					// Create outline to indicate current viewport.
					var navigatorBorderColor = Z.Utils.getResource('DEFAULT_NAVIGATORBORDERCOLOR');
					var navigatorBorder = Z.Utils.createContainerElement(zvIntID, 'div', 'navigatorBorder' + navViewportIDStr, 'inline-block', 'absolute', 'hidden', navW+1 + 'px', navH+1 + 'px', navL + 'px', navT + 'px', 'solid', '1px', 'transparent none', '0px', '0px', 'normal', null, true);
					navigatorBorder.style.borderColor = Z.Utils.stringValidateColorValue(navigatorBorderColor);
					navigatorDisplay.appendChild(navigatorBorder);
					nBO = navigatorBorder;
					nboS = nB.style;
				}

				// Add navigator to viewer display and set size, position, visibility, and zIndex.
				thisViewer.ViewerDisplay.appendChild(navigatorDisplay);

				// DEV NOTE: Line above causes dimensions of nI to be 0 in IE11. Workaround
				// is to save values before line above and pass them into setSizeAndPosition function below.
				setSizeAndPosition(navW, navH, navL, navT, navFit, niW, niH);
				visibility(thisViewer.navigatorVisible == 1 || thisViewer.navigatorVisible == 2);

				// Enable mouse, initialize navigator, sync to viewport.
				// Prevent object dragging and bubbling.
				Z.Utils.addEventListener(nD, 'mouseover', Z.Utils.stopPropagation);
				Z.Utils.addEventListener(nD, 'mousedown', navigatorMouseDownHandler);
				Z.Utils.addEventListener(nD, 'touchstart', navigatorTouchStartHandler);
				Z.Utils.addEventListener(nD, 'touchmove', navigatorTouchMoveHandler);
				Z.Utils.addEventListener(nD, 'touchend', navigatorTouchEndHandler);
				Z.Utils.addEventListener(nD, 'touchcancel', navigatorTouchCancelHandler);

				setInitialized(true);
				syncToViewport(); // Method also called in setSizeAndPosition | drawLayout above but that is prior to full initialization of navigator.

			} else {
				var navigatorImageLoadedTimer = window.setTimeout( function () { initializeNavigator(placeholder, image); }, 100);
			}
		}

		// Support imageSet viewing.
		function initializeNavigatorMultipleViewports () {	
			if (navigatorImages && navigatorImages.length > 0 && navigatorImages[0] !== null && navigatorImages[0].image.width > 0) {
				// Clone thumbnail to protect later reuse.
				var index = Z.Utils.arrayIndexOfObjectValue(navigatorImages, 'id', '0');
				if (index != -1 ) {
					var navigatorImageTemp = navigatorImages[index].image;
					navigatorImage = navigatorImageTemp.cloneNode(false);
					navigatorImageTemp = null;
					if (typeof placeholder === 'undefined') { var placeholder = null; }
					initializeNavigator(placeholder, navigatorImage);
				} else {
					var navigatorImageMultipleViewportTimer = window.setTimeout( function() { initializeNavigatorMultipleViewports(); }, 100);
				}
			} else {
				var navigatorImageMultipleViewportTimer = window.setTimeout( function() { initializeNavigatorMultipleViewports(); }, 100);
			}
		}

		this.setImage = function (imagePath) {
			if (niC && navigatorImage && niC.childNodes.length > 0) {
				if (thisViewer.tracking) { navigatorDisplay.removeChild(navigatorTrackingOverlay);}
				niC.innerHTML = '';
			}
			if (typeof navigatorImages === 'undefined' || navigatorImages === null || navigatorImages.length == 0) {
				loadNavigatorImage(reinitializeNavigator);
			} else {
				var index = Z.Utils.arrayIndexOfObjectValue(navigatorImages, 'id', navViewportIDStr);
				if (index != -1) {
					navigatorImage = navigatorImages[index].image;
					reinitializeNavigator(navigatorImage);
				}
			}
		}

		function reinitializeNavigator (image) {
			if (navigatorDisplay) {
				if (thisViewer.slideshow) { Z.Utils.setOpacity(navigatorDisplay, 0); }
				if (thisViewer.tileSource == 'ZoomifyZIFFile' || (thisViewer.tileSource == 'ZoomifyPFFFile' && thisViewer.tileHandlerPathFull === null)) { navigatorImage = image; }

				if (niC && navigatorImage && navigatorImage.width > 0 && navigatorImage.height > 0) {
					// DEV NOTE: Line above causes dimensions of nI to be 0 in IE11. Workaround is to save values before line above and pass them into setSizeAndPosition function below.
					var niW = navigatorImage.width;
					var niH = navigatorImage.height;
					niC.appendChild(navigatorImage);
					nI = navigatorDisplay.childNodes[1].firstChild; // Thumbnail.
					setSizeAndPosition(navW, navH, navL, navT, navFit, niW, niH);
					var componentsVisible = ((thisViewer.ToolbarDisplay && thisViewer.ToolbarDisplay.style.display == 'inline-block' && !thisViewer.ToolbarMinimized) || (typeof slideList !== 'undefined' && slideList !== null && slideList.style.visibility == 'visible'));
					visibility((thisViewer.navigatorVisible == 1 || thisViewer.navigatorVisible == 2) && componentsVisible);

					// Ensure proper z-ordering of Viewer elements.
					navigatorDisplay.style.zIndex = (thisViewer.baseZIndex + 4).toString();

					syncToViewport();

				} else {
					var navigatorImageReinitializationTimer = window.setTimeout( function () { reinitializeNavigator(); }, 100);
				}
			}
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::::: GET & SET FUNCTIONS ::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		this.getInitialized = function () {
			return getInitialized();
		}

		function getInitialized () {
			return isInitialized;
		}

		function setInitialized (initialized) {
			if (!isInitialized && initialized) {
				isInitialized = true;
				validateCallback('navigatorInitialized');
				thisViewer.validateViewerReady('navigatorInitialized');
			}
		}

		this.setVisibility = function (visible) {
			visibility(visible);
		}

		this.setSelected = function (selected) {
			if (!nBO) { var nBO = Z.Utils.getElementOfViewerById(zvIntID, 'navigatorBorder' + navViewportIDStr); }
			if (nBO) {
				var nboS = nBO.style;
				nboS.display = (selected) ? 'inline-block' : 'none';
			}
		}

		this.syncToViewport = function () {
			syncToViewport();
		}

		this.syncNavigatorRectangleDimensions = function () {
			syncNavigatorRectangleDimensions();
		}

		this.syncNavigatorRotation = function () {
			syncNavigatorRotation();
		}

		this.syncNavigatorRectangleToViewport = function (currentCenterPt) {
			syncNavigatorRectangleToViewport(currentCenterPt);
		}

		// Support imageSet viewing.
		this.setViewport = function (navVwprt) {
			navViewport = navVwprt;
			navViewportIDStr = navViewport.getViewportID().toString();

			// If using overlays and linking navigator to top VP, prevent resetting of thumbnail from base VP to top VP.
			if (!thisViewer.overlays ) { thisNavigator.setImage(navViewport.getImagePath()); }
		}

		this.drawNavigatorTrackingOverlay = function (trackingCells, navImgArr) {
			var navTrackOverlay = Z.Utils.getElementOfViewerById(zvIntID, 'navigatorTrackingOverlay');
			if (typeof navTrackOverlay === 'undefined' || navTrackOverlay === null) {
				var navTrackOverlay = Z.Utils.createContainerElement(zvIntID, 'div', 'navigatorTrackingOverlay', 'none', 'absolute', 'visible', navW+1 + 'px', navH+1 + 'px', navL + 'px', navT + 'px', 'none', '0px', 'transparent-none', '0px', '0px', 'normal', null, true);
				navigatorDisplay.appendChild(navTrackOverlay);
			}
			if (navTrackOverlay) {
				while (navTrackOverlay.hasChildNodes()) { navTrackOverlay.removeChild(navTrackOverlay.lastChild); }
				if (typeof navImgArr === 'undefined' || navImgArr === null) { navImgArr = thisViewer.Navigator.getSizeAndPositionNavigatorImage(); }
				if (navImgArr) {
					var overlayCellWPercent = navImgArr.width / thisViewer.imageW;
					var overlayCellHPercent = navImgArr.height / thisViewer.imageH;
					var overlayCellW = Math.round(thisViewer.viewerW * overlayCellWPercent);
					var overlayCellH = Math.round(thisViewer.viewerH * overlayCellHPercent);

					for (var i = 0, j = trackingCells.length; i < j; i++) {
						if (trackingCells[i].complete) {
							var cellIDValues = navViewport.getCoordinatesFromTrackingCellID(trackingCells[i].id);
							if (cellIDValues.x !== null && cellIDValues.y !== null && cellIDValues.z !== null) {

								// Calculate overlay cell sizes and positions.
								var overlayCellZ = cellIDValues.z / 100;
								var cellW = overlayCellW / overlayCellZ;
								var cellH = overlayCellH / overlayCellZ;
								var overlayCellL = Math.floor(cellIDValues.x * cellW);
								var overlayCellT = Math.floor(cellIDValues.y * cellH);

								// Constrain edge overlay cell dimensions to thumbnail area.
								cellW = ((overlayCellL + cellW) <= navImgArr.width) ? cellW : navImgArr.width - overlayCellL;
								cellH = ((overlayCellT + cellH) <= navImgArr.height) ? cellH : navImgArr.height - overlayCellT;

								// Create overlay cells.
								var cellComp = 'cellComp' + i.toString();
								var trackingOverlayCellColor = getTrackingOverlayColor(overlayCellZ);
								navTrackOverlay[cellComp] = Z.Utils.createContainerElement(zvIntID, 'div', cellComp, 'inline-block', 'absolute', 'visible', cellW + 'px', cellH + 'px', overlayCellL + 'px', overlayCellT + 'px', 'solid', '1px', trackingOverlayCellColor, '0px', '0px', 'normal', null, true);
								navTrackOverlay.appendChild(navTrackOverlay[cellComp]);
								Z.Utils.setOpacity(navTrackOverlay[cellComp], 0.25);
							}
						}
					}
				} else {
					var drawTrackingTimer = window.setTimeout( function () { thisNavigator.drawNavigatorTrackingOverlay(trackingCells); }, 10);
				}
			}
		}

		getTrackingOverlayColor = function (zoom) {
			var mag = Z.Utils.convertZoomPercentToMagnification(zoom * 100, thisViewer.sourceMagnification, true);
			var magLevelStr = (mag < 2) ? '1' : (mag < 4) ? '2' : (mag < 10) ? '4' : (mag < 16) ? '10' : (mag < 25) ? '16' : (mag < 40) ? '25' : (mag < 60) ? '40' : (mag < 100) ? '60' : 'INFINITY';
			var magColorStr = 'UI_TRACKINGNAVIGATOROVERLAYCOLOR_UNDER' + magLevelStr;
			var trackingOverlayColor = Z.Utils.stringValidateColorValue(Z.Utils.getResource(magColorStr));
			return trackingOverlayColor;
		}



		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::: CORE FUNCTIONS ::::::::::::::::::::::::::::::::::::::
		//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		this.validateNavigatorGlobals = function () {
			if (getInitialized()) {
				validateNavigatorGlobals();
			} else {
				validateNavigatorGlobalsInterval = window.setInterval(validateNavigatorGlobals, 300);
			}
		}

		function validateNavigatorGlobals () {
			// Ensure synchronizing calls to navigator functions from viewport have access to navigator
			// internal global variables.  First clear any interval used to call this function after initialization.
			if (getInitialized()) {
				if (validateNavigatorGlobalsInterval) {
					window.clearInterval(validateNavigatorGlobalsInterval);
					validateNavigatorGlobalsInterval = null;
				}
				if (!nD || !ndS || !nB || !nbS || !niC || !nicS || !nI || !nR || !nrS) {
					nD = navigatorDisplay;
					ndS = nD.style;
					nB = navigatorDisplay.firstChild; // Background.
					nbS = nB.style
					niC = navigatorDisplay.childNodes[1]; // Image container.
					nicS = niC.style
					nI = navigatorDisplay.childNodes[1].firstChild; // Thumbnail.
					nR = navigatorDisplay.childNodes[2]; // Navigation rectangle
					nrS = nR.style;
				}
			}
		}

		// DEV NOTE: Dual setSizeAndPosition functions below are workaround for undefined error on load
		// due to unhoisted function expression vs hoisted function declaration and/or IE8 limitations.
		this.setSizeAndPosition = function (width, height, left, top, fit, niW, niH) {
			setSizeAndPosition(width, height, left, top, fit, niW, niH);
		}

		function setSizeAndPosition (width, height, left, top, fit, niW, niH) {
			if (!fit) { fit = navFit; }
			if (typeof width === 'undefined' || width === null) { width = thisViewer.navigatorW; }
			if (typeof height === 'undefined' || height === null) { height = thisViewer.navigatorH; }
			if (typeof left === 'undefined' || left === null) { left = 0; }
			if (typeof top === 'undefined' || top === null) { top = 0; }

			if (!nD) { nD = navigatorDisplay; }
			if (!ndS) { ndS = nD.style; }

			// Set navigator image var explicitly in case image is being reset using setImage function to ensure thumbnail size is reset.
			nI = nD.childNodes[1].firstChild;

			// DEV NOTE: Next two lines are workaround for IE11 issue getting correct navigator image dimensions.
			// See comment on this line in calling function initializeNavigator: thisViewer.ViewerDisplay.appendChild(navigatorDisplay);
			if (nI.width == 0 && niW !== 'undefined' && niW !== null) { nI.width = niW; }
			if (nI.height == 0 && niH !== 'undefined' && niH !== null) { nI.height = niH; }

			if (nD && ndS && nI) {
				// Override defaults and parameters and match Navigator aspect ratio to Viewer.
				if (thisViewer.tracking) { fit = 0; }

				// If fitting navigator to aspect ratio of image or viewer calculate and apply aspect ratio to reset navigator
				// dimensions while constraining it within width and height parameters as bounding maximum values.
				if (typeof fit !== 'undefined' && fit !== null) {
					var navAspect = nI.width / nI.height;
					var viewerAspect = thisViewer.viewerW / thisViewer.viewerH;
					var targetAspect = (fit == 0) ? viewerAspect : navAspect;
					if (navAspect > 1) {
						height = width;
						height /= targetAspect;
					} else {
						width = height;
						width *= targetAspect;
					}
				}

				// Size navigator.
				ndS.width = width + 'px';
				ndS.height = height + 'px';

				// Set navigator position.
				ndS.left = left + 'px';
				ndS.top = top + 'px';

				drawLayout(width, height);
			}

			// Update global values and reposition dependent components.
			thisViewer.navigatorW = width;
			thisViewer.navigatorH = height;
			if (thisViewer.tracking || thisViewer.annotations) {
				if (thisViewer.Ruler && thisViewer.Ruler.getInitialized()) {
					var left = (thisViewer.rulerL == -1 && thisViewer.Navigator) ? thisViewer.navigatorL : thisViewer.rulerL;
					var top = (thisViewer.rulerT == -1 && thisViewer.Navigator) ? (thisViewer.navigatorT + thisViewer.navigatorH + 1) : thisViewer.rulerT;
					thisViewer.Ruler.setSizeAndPosition(thisViewer.rulerW, thisViewer.rulerH, left, top);
				}
				if (thisViewer.userPanelVisible && thisViewer.UserPanel !== null) {
					var panelW = thisViewer.rulerW;
					var panelH = parseInt(Z.Utils.getResource('DEFAULT_USERPANELHEIGHT'), 10);
					var panelCoords = calculateUserPanelCoords(Z.userPanelPosition, panelW, panelH, thisViewer.viewerW, thisViewer.viewerH);
					var left = (thisViewer.rulerL == -1 && thisViewer.Navigator) ? thisViewer.navigatorL : thisViewer.rulerL;
					var top = (thisViewer.rulerT == -1 && thisViewer.Navigator) ? (thisViewer.navigatorT + thisViewer.navigatorH + 1) : thisViewer.rulerT;
					sizeAndPositionUserPanel(thisViewer.UserPanel.style, panelW, panelH, panelCoords.x, panelCoords.y);
				}
				if (thisViewer.imageList && navViewport.getStatus('initializedImageList')) {
					navViewport.setSizeAndPositionImageList();
					if (thisViewer.comparison) {
						var vpComparison = (navViewport.getViewportID() == 0) ? thisViewer.Viewport1 : thisViewer.Viewport0;
						if (vpComparison && vpComparison.getStatus('initializedImageList')) { 
							vpComparison.setSizeAndPositionImageList();
						}
					}
				}
			}
		}

		function drawLayout (width, height) {
			if (!nI) { nI = navigatorDisplay.childNodes[1].firstChild; } // Thumbnail image.
			if (nI && nI.width != 0 && nI.height != 0) {
				if (!nbS) { nbS = navigatorDisplay.firstChild.style; } // Background.
				if (!nicS) { nicS = navigatorDisplay.childNodes[1].style; } // Image container.
				if (nbS && nicS) {
					nbS.width = width + 'px';
					nbS.height = height + 'px';
					setSizeNavigatorImage(width, height);
					nicS.width = nI.width + 'px';
					nicS.height = nI.height + 'px';
					nicS.left = ((width - nI.width) / 2) + 'px';
					nicS.top = ((height - nI.height) / 2) + 'px';
					syncToViewport();
					if (thisViewer.comparison) {
						if (!nBO) { var nBO = Z.Utils.getElementOfViewerById(zvIntID, 'navigatorBorder' + navViewportIDStr); }
						if (nBO) {
							var nboS = nBO.style;
							nboS.width = (width - 2) + 'px';
							nboS.height = (height - 2) + 'px';
							nboS.left = parseFloat(nbS.left) + 'px';
							nboS.top = parseFloat(nbS.top) + 'px';
							nboS.display = (navViewportIDStr == thisViewer.viewportCurrentID) ? 'inline-block' : 'none';
						}
					}
				}
			} else {
				var drawLayoutTimer = window.setTimeout( function () { drawLayout(width, height); }, 100);
			}
		}

		function setSizeNavigatorImage (navW, navH) {
			if (!nI) { nI = navigatorDisplay.childNodes[1].firstChild; } // Thumbnail image.
			if (nI) {
				var navImgW = nI.width;
				var navImgH = nI.height;
				var imageAspectRatio = navImgW / navImgH;
				var scaleW = navW / navImgW;
				var scaleH = navH / navImgH;
				if (scaleW <= scaleH) {
					navImgW = navW;
					navImgH = navW / imageAspectRatio;
					navImageT = ((navH - navImgH * (navW / navImgW)) / 2);
				} else if (scaleH < scaleW) {
					navImgH = navH;
					navImgW = navH * imageAspectRatio;
					navImageL = ((navW - navImgW * (navH / navImgH)) / 2);
				}
				nI.width = navImgW;
				nI.height = navImgH;
			}
		}

		this.getSizeAndPositionNavigatorImage = function () {
			if (!nI) { nI = navigatorDisplay.childNodes[1].firstChild; } // Thumbnail image.
			var niArr = null;
			if (typeof nI.parentNode !== 'undefined' && nI.parentNode !== null) {
				var niPS = nI.parentNode.style;
				var niArr = { width:nI.width, height:nI.height, left:parseFloat(niPS.left)-1, top:parseFloat(niPS.top)-1 }
			}
			return niArr;
		}

		function visibility (visible) {
			if (!ndS && navigatorDisplay) { ndS = navigatorDisplay.style; }
			if (ndS) {
				if (visible) {
					ndS.display = 'inline-block';
				} else {
					ndS.display = 'none';
				}
			}
		}

		function syncToViewport () {
			// Set navigator rectangle size and position.
			if (navViewport && navViewport.getStatus('initializedViewport')) {
				syncNavigatorRotation();
				syncNavigatorRectangleDimensions();
				var currentCenterPt = navViewport.calculateCurrentCenterCoordinates();
				syncNavigatorRectangleToViewport(currentCenterPt);
			}
		}

		function syncNavigatorRectangleDimensions () {
			if (nI && nrS) {
				var scaleW = nI.width / thisViewer.imageW;
				var scaleH = nI.height / thisViewer.imageH;

				var recalculate = (thisViewer.comparison && navViewportIDStr != thisViewer.viewportCurrentID);
				var currentZ = navViewport.getZoom(recalculate);

				var vpScaledW = thisViewer.viewerW * scaleW / currentZ;
				if (thisViewer.comparison) { vpScaledW /= 2; }
				var vpScaledH = thisViewer.viewerH * scaleH / currentZ;

				nrS.width = vpScaledW + 'px';
				nrS.height = vpScaledH + 'px';
			}
		}

		function syncNavigatorRotation () {
			if (!nicS && navigatorDisplay) { nicS = navigatorDisplay.childNodes[1].style; } // Image container.
			if (nicS) {
				var currentR = navViewport.getRotation();
				Z.Utils.rotateElement(nicS, currentR, thisViewer.imageR, true);
			}
		}

		function syncNavigatorRectangleToViewport (vpImgCtrPt) {
			// Convert image pixel coordinates at viewport display center to navigator
			// pixel coordinates to position top left of navigator rectangle.
			if (nI && nrS && nicS) {
				if (typeof vpImgCtrPt === 'undefined' || vpImgCtrPt === null || (vpImgCtrPt.x == 0 && vpImgCtrPt.y == 0)) {
					var vpImgCtrPt = new Z.Utils.Point(thisViewer.imageX, thisViewer.imageY);
				}
				if (typeof z === 'undefined' || z === null) { z = thisViewer.imageZ; }
				var r = thisViewer.imageR;
				if (r < 0) { r += 360; } // Ensure positive values.

				// Convert coordinates from image pixels to thumbnail pixels.
				var tW = parseFloat(nI.width);
				var tH = parseFloat(nI.height);
				var scaleW = tW / thisViewer.imageW;
				var scaleH = tH / thisViewer.imageH;
				var tX = vpImgCtrPt.x * scaleW;
				var tY = vpImgCtrPt.y * scaleH;

				// Translate coordinates to center axis perspective and rotate.
				var tcX = tX - tW / 2;
				var tcY = tY - tH / 2;
				var rcPt = Z.Utils.rotatePoint(tcX, tcY, -r);

				// Adjust new rectangle position for rectangle and navigator offsets.
				var rL = rcPt.x - parseFloat(nrS.width) / 2;
				var rT = rcPt.y - parseFloat(nrS.height) / 2;
				var ncX = parseFloat(ndS.width) / 2;
				var ncY = parseFloat(ndS.height) / 2;

				var compAdj = (thisViewer.comparison) ? -1 : 0;
				var rnL = ncX + rL + compAdj;
				var rnT = ncY + rT - 1;

				// Apply new thumbnail rectangle coordinates to navigator display.
				nrS.left = rnL + 'px';
				nrS.top = rnT + 'px';
			}
		}

		// Convert navigator pixel coordinates at top left of navigator rectangle to image
		// pixel coordinates at viewport display center and pass to viewport to position view.
		function syncViewportToNavigatorRectangle (click) {
			if (nI && nrS && nicS) {
				var z = thisViewer.imageZ;
				var r = thisViewer.imageR;
				if (r < 0) { r += 360; } // Ensure positive values.

				// Get scaling factor and scale current image coordinates.
				var thumbW = parseFloat(nI.width);
				var thumbH = parseFloat(nI.height);
				 var scaleW = thumbW / thisViewer.imageW;
				var scaleH = thumbH / thisViewer.imageH;
				var thumbX = thisViewer.imageX * scaleW;
				var thumbY = thisViewer.imageY * scaleH;

				// Get offset corrected position of navigator rectangle.
				var psPt = Z.Utils.getPageScroll();
				var scrollOffsetX = (click) ? psPt.x : 0;
				var scrollOffsetY = (click) ? psPt.y : 0;
				var navRectL = parseFloat(nrS.left) + scrollOffsetX;
				var navRectT = parseFloat(nrS.top) + scrollOffsetY;
				var currentX = (navRectL - parseFloat(ndS.width) / 2) + parseFloat(nrS.width) / 2 + thumbW / 2;
				var currentY = (navRectT - parseFloat(ndS.height) / 2) + parseFloat(nrS.height) / 2 + thumbH / 2;

				// Rotate current thumb coords and scale to image pixels.
				var currentPtRotated = Z.Utils.getPositionRotated(currentX, currentY, thumbX, thumbY, -r, thisViewer.imageR);
				var newVPImgCtrX = Math.round(currentPtRotated.x / scaleW);
				var newVPImgCtrY = Math.round(currentPtRotated.y / scaleH);

				// Apply new image pixel coordinates to viewport display.
				if (click) {
					navViewport.zoomAndPanToView(newVPImgCtrX, newVPImgCtrY, z, r);
				} else {
					var newVPImgCtrPt = new Z.Utils.Point(newVPImgCtrX, newVPImgCtrY);
					navViewport.syncViewportToNavigator(newVPImgCtrPt);
				}

				// Sync counter tracking.
				if (thisViewer.tracking) { navViewport.syncTrackingToViewport(); }
			}
		}

		function navigatorImageLoadingFailed () {
			thisViewer.showMessage(Z.Utils.getResource('ERROR_NAVIGATORIMAGEPATHINVALID'));
		}



		//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::::::::: EVENT FUNCTIONS :::::::::::::::::::::::::::::::::::
		//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

		function navigatorMouseDownHandler (event) {
			if (!thisViewer.interactive) { return; }

			navViewport.zoomAndPanAllStop(false, true);
			thisViewer.mouseIsDown = true;
			if (thisViewer.comparison) { thisViewer.viewportSelect(parseInt(navViewportIDStr, 10)); }
			if (thisViewer.maskingSelection && thisViewer.maskClearOnUserAction) { navViewport.clearMask(); }

			if (nD && nR && nrS) {
				var event = Z.Utils.event(event);
				nR.mouseXPrior = event.clientX;
				nR.mouseYPrior = event.clientY;
				dragPtStart = new Z.Utils.Point(event.clientX, event.clientY);
				Z.Utils.addEventListener(nD, 'mousemove', navigatorMouseMoveHandler);
				Z.Utils.addEventListener(nD, 'mouseup', navigatorMouseUpHandler);
				Z.Utils.addEventListener(document, 'mouseup', navigatorMouseUpHandler);
			}
		}

		function navigatorMouseMoveHandler (event) {
			if (!thisViewer.interactive) { return; }
			if (nR && nrS) {
				var x = parseFloat(nrS.left);
				var y = parseFloat(nrS.top);
				nrS.left = x + (event.clientX - nR.mouseXPrior) + 'px';
				nrS.top = y + (event.clientY - nR.mouseYPrior) + 'px';
				nR.mouseXPrior = event.clientX;
				nR.mouseYPrior = event.clientY;
				syncViewportToNavigatorRectangle(false);
				return false;
			}
		}

		function navigatorMouseUpHandler (event) {
			if (!thisViewer.interactive) { return; }

			thisViewer.mouseIsDown = false;

			if (nD && nR && nrS) {
				document.mousemove = null;
				document.mouseup = null;
				Z.Utils.removeEventListener(nD, 'mousemove', navigatorMouseMoveHandler);
				Z.Utils.removeEventListener(nD, 'mouseup', navigatorMouseUpHandler);
				Z.Utils.removeEventListener(document, 'mouseup', navigatorMouseUpHandler);
				var event = Z.Utils.event(event);
				var dragPtEnd = new Z.Utils.Point(event.clientX, event.clientY);
				var dragDist = Z.Utils.calculatePointsDistance(dragPtStart.x, dragPtStart.y, dragPtEnd.x, dragPtEnd.y);
				var click = dragDist < MOUSECLICK_THRESHOLD_NAVIGATOR;
				if (click) {
					var navDispOffsets = Z.Utils.getElementPosition(navigatorDisplay);
					nrS.left = event.clientX - navDispOffsets.x - (parseFloat(nrS.width) / 2) + 'px';
					nrS.top = event.clientY - navDispOffsets.y - (parseFloat(nrS.height) / 2) + 'px';
				}
				syncViewportToNavigatorRectangle(click);
				if (!thisViewer.comparison || !click) { 
					navViewport.updateView();
				}
			}
		}

		function navigatorTouchStartHandler (event) {
			if (!thisViewer.interactive) { return; }
			thisViewer.mouseIsDown = true;

			event.preventDefault(); // Prevent copy selection.
			if (nD && nR && nrS) {
				var touch = Z.Utils.getFirstTouch(event);
				if (touch) {
					var target = touch.target;
					var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
					dragPtStart = new Z.Utils.Point(mPt.x, mPt.y);
					nR.mouseXPrior = mPt.x;
					nR.mouseYPrior = mPt.y;
				}
			}
		}

		function navigatorTouchMoveHandler (event) {
			if (!thisViewer.interactive) { return; }
			event.preventDefault(); // Prevent page dragging.
			if (!thisViewer.mousePan) { return; }  // Disallow mouse panning if parameter false.

			if (nR && nrS) {
				var touch = Z.Utils.getFirstTouch(event);
				if (touch) {
					var target = touch.target;
					var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
					var x = parseFloat(nrS.left);
					var y = parseFloat(nrS.top);
					nrS.left = x + (mPt.x - nR.mouseXPrior) + 'px';
					nrS.top = y + (mPt.y - nR.mouseYPrior) + 'px';
					nR.mouseXPrior = mPt.x;
					nR.mouseYPrior = mPt.y;
					syncViewportToNavigatorRectangle(false);
					return false;
				}
			}

			return false;
		}

		function navigatorTouchEndHandler (event) {
			if (!thisViewer.interactive) { return; }
			thisViewer.mouseIsDown = false;

			if (nD && nR && nrS) {
				var touch = Z.Utils.getFirstTouch(event);
				if (touch) {
					var target = touch.target;
					var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
					var dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
					var dragDist = Z.Utils.calculatePointsDistance(dragPtStart.x, dragPtStart.y, dragPtEnd.x, dragPtEnd.y);
					var click = dragDist < TOUCHTAP_THRESHOLD_NAVIGATOR;
					if (click) {
						var navDispOffsets = Z.Utils.getElementPosition(navigatorDisplay);
						nrS.left = mPt.x - navDispOffsets.x - (parseFloat(nrS.width) / 2) + 'px';
						nrS.top = mPt.y - navDispOffsets.y - (parseFloat(nrS.height) / 2) + 'px';
					}
				}
				syncViewportToNavigatorRectangle(click);
				navViewport.updateView();
			}
		}

		function navigatorTouchCancelHandler (event) {
			if (!thisViewer.interactive) { return; }
			thisViewer.mouseIsDown = false;

			if (nD && nR && nrS) {
				var touch = Z.Utils.getFirstTouch(event);
				if (touch) {
					var target = touch.target;
					var mPt = new Z.Utils.Point(touch.pageX, touch.pageY);
					var dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
					var dragDist = Z.Utils.calculatePointsDistance(dragPtStart.x, dragPtStart.y, dragPtEnd.x, dragPtEnd.y);
					var click = dragDist < TOUCHTAP_THRESHOLD_NAVIGATOR;
					if (click) {
						var navDispOffsets = Z.Utils.getElementPosition(navigatorDisplay);
						nrS.left = mPt.x - navDispOffsets.x - (parseFloat(nrS.width) / 2) + 'px';
						nrS.top = mPt.y - navDispOffsets.y - (parseFloat(nrS.height) / 2) + 'px';
					}
				}
				syncViewportToNavigatorRectangle(click);
				navViewport.updateView();
			}
		}
	};
};
	
	

//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::: NETCONNECTOR FUNCTIONS ::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.NetConnector = function (targetViewer) {
	var imagesLoading = 0;
	var IMAGES_LOADING_MAX = parseInt(Z.Utils.getResource('DEFAULT_IMAGESLOADINGMAX'), 10);
	var IMAGE_LOAD_TIMEOUT = parseFloat(Z.Utils.getResource('DEFAULT_IMAGELOADTIMEOUT'));
	var loadImageQueueDelay = Z.Utils.getResource('DEFAULT_IMAGELOADQUEUEDELAY');
	var loadImageQueueInterval;
	var loadImageQueue = [];

	this.loadHTML = function (htmlPath, recResp) {
		makeNetRequest(htmlPath, recResp, null);
	}

	this.loadXML = function (xmlPath, vpID) {
		if (typeof vpID === 'undefined' || vpID === null) {
			makeNetRequest(xmlPath, receiveResponse, null);
		} else {
			makeNetRequest(xmlPath, function(xhr) { receiveResponse(xhr, vpID); }, null);
		}
	}

	this.loadJSON = function (jsonPath) {
		makeNetRequest(jsonPath, receiveResponse, null);
	}

	this.loadByteRange = function (filePath, rangeStart, rangeEnd, contentType, tile, chunkID, vpID) {
		var rangeData = new Z.Utils.Range(rangeStart, rangeEnd);
		if (Z.localFileSelected) {
			// Parameter vpID passed instead of callback because function sets validateBytes as onloadend function.
			makeLocalRequest(filePath, vpID, rangeData, contentType, tile, chunkID);
		} else {
			makeNetRequest(filePath, function(xhr) { receiveResponse(xhr, vpID); }, rangeData, contentType, tile, chunkID);
		}
	}

	function loadImageByteRange (filePath, contentType, tile, vpID) {
		var tileName = (tile !== null) ? tile.name : 'null-nav?';
		var imagePath = filePath.substring(0, filePath.indexOf('?'));
		var rangeStart = parseFloat(filePath.substring(filePath.indexOf('?') + 1, filePath.indexOf(',')));
		var rangeLength = parseFloat(filePath.substring(filePath.indexOf(',') + 1, filePath.length));
		var rangeEnd = rangeStart + rangeLength;
		var rangeData = new Z.Utils.Range(rangeStart, rangeEnd);
		if (Z.localFileSelected) {
			// Parameter vpID passed instead of callback because function sets validateBytes as onloadend function.
			makeLocalRequest(filePath, vpID, rangeData, contentType, tile, null);
		} else {
			makeNetRequest(imagePath, function(xhr) { receiveResponse(xhr, vpID); }, rangeData, contentType, tile);
		}
	}

	this.postXML = function (saveHandlerPath, xmlData, postType) {
		makeNetRequest(saveHandlerPath, receiveResponse, xmlData, 'postXML', null, null, postType);
	}

	this.postImage = function (saveImageHandlerPath, imageData) {
		makeNetRequest(saveImageHandlerPath, receiveResponse, imageData, 'postImage');
	}
	
	function makeLocalRequest (url, vpID, data, contentType, tile, chunkN, postType) {
		data.end += 1;
		var blob = Z.localFileData.slice(data.start, data.end);
		var localFileReader = new FileReader();				
		localFileReader.onloadend = function(event) {
			if (event.target.readyState == FileReader.DONE) {
				validateBytes(event.target.result, vpID, contentType, tile, chunkN);
			}
		};
		localFileReader.readAsArrayBuffer(blob);
	}
	
	function makeNetRequest (url, callback, data, contentType, tile, chunkN, postType) {
		var netRequest = createXMLHttpRequest();
		if (netRequest === null) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_XMLHTTPREQUESTUNSUPPORTED'));

		} else {
			var isAsync = (typeof callback === 'function');
			if (isAsync) {
				var actual = callback;
				var callback = function () { window.setTimeout(Z.Utils.createCallback(null, actual, netRequest), 1); };
				netRequest.onreadystatechange = function () {
					if (netRequest.readyState == 4) {
						netRequest.onreadystatechange = new Function ();
						callback();
					}
				};
			}

			try {
				if (typeof data === 'undefined' || data === null) {
					// Load XML here. Also support loading of HTML for custom Help page.
					netRequest.open('GET', url, isAsync);
					if (contentType == 'loadHTML') { netRequest.setRequestHeader('Content-Type', 'text/html'); }
					netRequest.send(null);

				} else if (typeof contentType !== 'undefined' && contentType !== null) {
					// Prevent local posting attempts.
					if (Z.localUse && (contentType == 'postXML' || contentType == 'postImage')) {
						targetViewer.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALSAVING'), false, targetViewer.messageDurationStandard, 'center', true);
						return;
					}

					if (contentType == 'postXML') {
						var postErrorString = null;
						if (postType == 'annotation' && (typeof targetViewer.annotationPath === 'undefined' || !Z.Utils.stringValidate(targetViewer.annotationPath))) {
							postErrorString = Z.Utils.getResource('ERROR_ANNOTATIONPATHMISSING');
						} else if (postType == 'tracking' && (typeof targetViewer.trackingPath === 'undefined' || !Z.Utils.stringValidate(targetViewer.trackingPath))) {
							postErrorString = Z.Utils.getResource('ERROR_TRACKINGPATHMISSING-EDITING');
						}
						if (postErrorString !== null) {
							targetViewer.showMessage(postErrorString, false, targetViewer.messageDurationStandard, 'center');

						} else {
							// Debug option: console.log('url: ' + url + '  data: ' + Z.Utils.xmlConvertDocToText(data));
							var postPath, postPathLen, postPathLower, postFile, postFileDef;
							if (postType == 'annotation') {
								postPath = targetViewer.annotationPath;
								postPathLower = postPath.toLowerCase();
								postFileDef = Z.Utils.getResource('DEFAULT_ANNOTATIONSXMLFILE');
							} else if (postType == 'tracking') {
								postPath = targetViewer.trackingPath;
								postPathLower = postPath.toLowerCase();
								postFileDef = Z.Utils.getResource('DEFAULT_TRACKINGXMLFILE');
							}
							postPathLen = postPathLower.length;

							if ((postPathLower.substring(postPathLen - 5, postPathLen) != '.json') && (postPathLower.substring(postPathLen - 4, postPathLen) != '.xml')) {
								postFile = '/' + postFileDef;
							}
							if(typeof postFile === "undefined") { postFile = ""; }
							var postPathFull = postPath + postFile;
							targetViewer.postingXML = true;
							netRequest.open('POST', url + '?file=' + postPathFull, true);

							// Alternative implementation - also enabled: Requires upload file that receives variable rather than parsing query string from upload script file path.
							Z.Utils.defineObjectProperty(netRequest, 'file', { value : postPathFull, writable : false, enumerable : false, configurable : false });

							netRequest.setRequestHeader('Content-Type', 'application/xml');
							netRequest.send(data);
						}

					} else if (contentType == 'postImage') {
						// Debug option: console.log('url: ' + url + ' data.length: ' + data.length + ' fileName: ' + targetViewer.saveImageFilename + ' fileFormat: ' + targetViewer.saveImageFormat + '  fileCompression: ' + targetViewer.saveImageCompression);
						// DEV NOTE: Form submission required or progress event. Also, 'multipart/form-data' stated as required for form upload but appears not so, and prevents use of simpler file_get_contents("php://input"); approach on server-side in php.
						targetViewer.showMessage(Z.Utils.getResource('ALERT_IMAGESAVEUPLOADING'), false, 'none', 'center');

						targetViewer.postingImage = true;
						var fd = new FormData();
						fd.append('fileToUpload', data);
						Z.Utils.addEventListener(netRequest.upload, 'progress', uploadProgress);
						netRequest.open('POST', url, true);
						Z.Utils.defineObjectProperty(netRequest, 'zType', { value : 'postingImage', writable : false, enumerable : false, configurable : false });
						netRequest.setRequestHeader('Content-Type', 'application/upload');
						netRequest.send(fd);

					} else if (targetViewer.tileSource == 'ZoomifyZIFFile' || targetViewer.tileSource == 'ZoomifyPFFFile') {
						// Cache proofing applied here on all byterange requests for header and chunks but not tiles. This approach
						// supports consistency and avoids duplicate applications. These are non-XML, non-posting, non-PFF requests.
						// Note that byte range start and end values are in imagePath until function loadImageByteRange parses them
						// and passes them to this function as data parameter, leaving url parameter clean for cache proofing.
						if (contentType != 'tile') { url = Z.Utils.cacheProofPath(url); }
						netRequest.open('GET', url, true);
						netRequest.responseType = 'arraybuffer';

						// Include contentType, tile, and chunk number values to be returned in response.
						Z.Utils.defineObjectProperty(netRequest, 'zType', { value : contentType, writable : false, enumerable : false, configurable : false });
						Z.Utils.defineObjectProperty(netRequest, 'zTile', { value : tile, writable : false, enumerable : false, configurable : false });
						Z.Utils.defineObjectProperty(netRequest, 'zChunkNumber', { value : chunkN, writable : false, enumerable : false, configurable : false });

						// Prevent Safari byte range request response caching.
						if (Z.browser == Z.browsers.SAFARI) {
							netRequest.setRequestHeader('If-Modified-Since', 'Thu, 01 Dec 1994 16:00:00 GMT');
						}

						// Set range header and send request.						
						netRequest.setRequestHeader('Range', 'bytes=' + data.start.toString() + '-' + data.end.toString());
						netRequest.send(null);
					}
				}

			} catch (e) {
				netRequestErrorHandler(e, url, contentType);
				netRequest = null;
				console.log(e);

				// if (isAsync) { callback(); } // Debug option.
			}
		}
	}

	function createXMLHttpRequest () {
		var netReq = null;
		switch (Z.xmlHttpRequestSupport) {
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

	// This error handler is applied within the function makeNetRequest in two ways for two different purposes:
	// first, as an onerror method which handles errors in the response to file requests, and second in the outer
	// try/catch statement, which handles errors in the creation of the netRequest calls themselves. Additional error
	// handling occurs in the function receiveResponse, where 404 and other server responses are handled.
	function netRequestErrorHandler (e, url, contentType) {
	console.log(e);
		if (Z.localUse == true && (Z.browser == Z.browsers.CHROME  || Z.browser == Z.browsers.OPERA || (Z.browser == Z.browsers.IE && Z.browserVersion == 11) || (Z.browser == Z.browsers.SAFARI && Z.browserVersion >= 7))) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-BROWSER'), false, targetViewer.messageDurationStandard, 'center');
		} else if (Z.localUse == true && targetViewer.tileSource == 'ZoomifyZIFFile') {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-ZIF'), false, targetViewer.messageDurationShort, 'center');
		} else if (Z.localUse == true && targetViewer.tileSource == 'ZoomifyPFFFile') {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-PFF'), false, targetViewer.messageDurationShort, 'center');
		} else if (url.toLowerCase().indexOf('.zif') != -1) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ZIFBYTERANGE') + contentType + '.', false, targetViewer.messageDurationShort, 'center');
		} else if (url.indexOf('ImageProperties.xml') != -1) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEXML'), true, null, 'left');
		} else if (url.toLowerCase().indexOf('.pff') != -1) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEHEADER'), false, targetViewer.messageDurationShort, 'center');
		} else if (url.toLowerCase().indexOf('.pff') != -1) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEXML-DZI'), false, targetViewer.messageDurationShort, 'center');
		} else if (url.toLowerCase().indexOf('reply_data') != -1) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEOFFSET'), false, targetViewer.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_SKINXMLFILE')) != -1) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-TOOLBARSKINSXML'), true, null, 'left');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_IMAGELISTXMLFILE')) != -1) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGELISTXML'), false, targetViewer.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_COMPARISONXMLFILE')) != -1) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-COMPARISONXML'), false, targetViewer.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_SLIDESXMLFILE')) != -1) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-SLIDESXML'), false, targetViewer.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_HOTSPOTSXMLFILE')) != -1) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-HOTSPOTSXML'), false, targetViewer.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_ANNOTATIONSXMLFILE')) != -1) {
			// The following attempt to address a missing annotations XML file is a failsafe for attempt in function receiveResponse.
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-CREATINGANNOTATIONSXMLFILE'), false, targetViewer.messageDurationShort, 'center');
			targetViewer.Viewport.createAnnotationsXMLFile();
			// Alternative implementation: Display error intead of creating annotations.xml file.
			//targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ANNOTATIONSXML'), false, targetViewer.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_ANNOTATIONSJSONFILE')) != -1) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ANNOTATIONSJSON'), false, targetViewer.messageDurationShort, 'center');
		} else if ((url.toLowerCase().indexOf(Z.Utils.getResource('DEFAULT_ANNOTATIONSXMLSAVEHANDLERNAME1')) != -1) || (url.toLowerCase().indexOf(Z.Utils.getResource('DEFAULT_ANNOTATIONSXMLSAVEHANDLERNAME1')) != -1)) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ANNOTATIONSSAVEHANDLER'), false, targetViewer.messageDurationShort, 'center');
		} else {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST'), false, targetViewer.messageDurationShort, 'center');
		}
	}

	// DEV NOTE: The conditionals in the clause below for the xhr.status values of 200/0/206 are timing dependent and therefore not optimal. They are necessary because
	// the onerror function assigned to the XMLHttpRequest in the function makeNetRequest above will fire on a failure at the network level, not the application level. A 404
	// file not found error is a valid network response so the test must occur here in the onreadystatechange handler. However, here, the url for the request is not known.
	// Note that the onerror can fire in Firefox for a local attempt with a 404 response. Note also that debugger consoles will show the requested url with a 404 response due
	// to privledged access. Future implementation may include a wrapper for the XMLHttpRequest request object that records the url.
	function receiveResponse (xhr, vpID) {
		if (!xhr) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_NETWORKSECURITY'), false, targetViewer.messageDurationShort, 'center');
		} else if (xhr.status !== 200 && xhr.status !== 0 && xhr.status !== 206) {
			var status = xhr.status;
			var statusText = (status == 404) ? 'Not Found' : xhr.statusText;
			if (targetViewer.xmlParametersParsing) {
				targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-PARAMETERSXML'), true, null, 'left');
			} else if (targetViewer.Toolbar && !targetViewer.Toolbar.getInitialized()) {
				targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-TOOLBARSKINSXML'), true, null, 'left');
			} else if (targetViewer.Viewport && targetViewer.annotationPath !== null && targetViewer.Viewport.getStatus('initializedViewport') && !targetViewer.Viewport.getStatus('XMLParsedViewport')) {
				targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-CREATINGANNOTATIONSXMLFILE'), false, targetViewer.messageDurationShort, 'center');
				targetViewer.Viewport.createAnnotationsXMLFile();
			} else if (targetViewer.tileSource == 'ZoomifyZIFFile') {
				targetViewer.showMessage(Z.Utils.getResource('ERROR_NETWORKSTATUSRANGEREQUESTS') + status + ' - ' + statusText, true, null, 'left');
			} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
				targetViewer.showMessage(Z.Utils.getResource('ERROR_NETWORKSTATUSRANGEREQUESTS') + status + ' - ' + statusText, true, null, 'left');
			} else if (targetViewer.tileSource == 'DZIFolder') {
				targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEXML-DZI') + status + ' - ' + statusText, true, null, 'left');
			} else {
				var callbackSet = targetViewer.verifyCallback('loadingImageXMLFailed');
				if (callbackSet) { 
					targetViewer.validateCallback('loadingImageXMLFailed');
					console.log(Z.Utils.getResource('ERROR_NETWORKSTATUS') + status + ' - ' + statusText);
				} else {
					targetViewer.showMessage(Z.Utils.getResource('ERROR_NETWORKSTATUS') + status + ' - ' + statusText, false, targetViewer.messageDurationShort, 'center');
				}
			}

		} else {
			var doc = null;
			var annotPathHasJSONExtension = (typeof targetViewer.annotationPath !== 'undefined' && Z.Utils.stringValidate(targetViewer.annotationPath) && targetViewer.annotationPath.toLowerCase().substring(targetViewer.annotationPath.length - 5, targetViewer.annotationPath.length) == '.json');
			if (targetViewer.postingImage && xhr.zType && xhr.zType == 'postingImage') {
				targetViewer.postingImage = false;		
				var callbackSet = targetViewer.verifyCallback('imageSaveComplete');
				if (callbackSet) { 
						targetViewer.hideMessage();
						targetViewer.validateCallback('imageSaveComplete');
				} else {
					targetViewer.showMessage(Z.Utils.getResource('ALERT_IMAGESAVESUCCESSFUL'), false, targetViewer.messageDurationShort, 'center');
				}
			} else if (xhr.response && xhr.zType && targetViewer.tileSource == 'ZoomifyZIFFile') {
				validateBytes(xhr, vpID);
			} else if (xhr.response && xhr.zType && targetViewer.tileSource == 'ZoomifyPFFFile') {
				validateBytes(xhr, vpID);
			} else if (xhr.responseXML && xhr.responseXML.documentElement && !annotPathHasJSONExtension) {
				doc = xhr.responseXML;
				validateXML(doc, vpID);
			} else if (xhr.responseText) {
				var respText = xhr.responseText;
				if (respText.indexOf('ZAS') != -1 && annotPathHasJSONExtension) {
					validateJSON(respText, vpID);
				} else if (targetViewer.tileSource == 'IIIFImageServer') {
					validateJSON(respText, vpID, true);
				} else if (targetViewer.postingXML) {
					targetViewer.postingXML = false;
					targetViewer.showMessage(Z.Utils.getResource('ALERT_ANNOTATIONSAVESUCCESSFUL'), false, targetViewer.messageDurationShort, 'center');
					if (targetViewer.Viewport) { targetViewer.Viewport.setAllHotspotsSaved(); }
				} else if (targetViewer.tileSource == 'ZoomifyImageFolder') {
					// Fallback for annotations XML incorrectly sent as Content Type  as text/html rather than  as text/xml.
					doc = Z.Utils.xmlConvertTextToDoc(respText);
					validateXML(doc, vpID);
				} else if (targetViewer.tileSource == 'ZoomifyZIFFile') {
					// Fallback for annotations XML incorrectly sent as Content Type  as text/html rather than  as text/xml.
					doc = Z.Utils.xmlConvertTextToDoc(respText);
					validateXML(doc, vpID);
				} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
					if (respText.toUpperCase().indexOf('PFFHEADER') != -1) {
						var dataIndex = respText.indexOf('reply_data=') + 'reply_data='.length;
						respText = respText.substring(dataIndex, respText.length);
					} else {
						// Normalize Zoomify Servlet response.
						var beginIndex = respText.indexOf('begin=') + 'begin='.length;
						var beginEndIndex = respText.indexOf('&', beginIndex);
						beginValue = respText.substring(beginIndex, beginEndIndex);
						var replyDataIndex = respText.indexOf('reply_data=') + 'reply_data='.length;
						replyDataValue = respText.substring(replyDataIndex, respText.length);
						respText = "<PFFOFFSET BEGIN='" + beginValue + "' REPLYDATA='" + replyDataValue + "' />";
					}
					doc = Z.Utils.xmlConvertTextToDoc(respText);
					validateXML(doc, vpID);
				} /*else if (targetViewer.tileSource == 'ImageServer') {
					// Example image server protocol implementation.
					// DEV NOTE: Process image server response here.
				}*/
			}
		}
	}

	function validateBytes (xhrOrBlob, vpID, type, tile, chunkNumber) {			
		if (targetViewer.Viewport) {
			if (!Z.localFileSelected) {
				type = xhrOrBlob.zType;
				chunkNumber = xhrOrBlob.zChunkNumber;
				tile = xhrOrBlob.zTile;
			}
			
			var dataString = (Z.localFileSelected) ? xhrOrBlob : xhrOrBlob.response;
			var targetViewport = (typeof vpID === 'undefined' || vpID === null || vpID == 0) ? targetViewer['Viewport'] : targetViewer['Viewport' + vpID.toString()];

			var data = new Z.Utils.createUint8Array(dataString, 0);
			if (type == 'header') {
				if (targetViewer.tileSourceMultiple === null) {
					if (targetViewer.tileSource == 'ZoomifyZIFFile') {
						targetViewport.parseZIFHeader(data);
					} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
						targetViewer.Viewport.parsePFFHeader(data);
					}
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (targetViewer.tileSource == 'ZoomifyZIFFile') {
							if (vpID == i) { targetViewer['Viewport' + i.toString()].parseZIFHeader(data); }
						} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
							if (vpID == i) { targetViewer['Viewport' + i.toString()].parsePFFHeader(data); }
						}
					}
				}
				
			} else if (type == 'jpegHeaders') {
				if (targetViewer.tileSourceMultiple === null) {
					targetViewport.parsePFFJPEGHeaders(data);
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (vpID == i) { targetViewer['Viewport' + i.toString()].parsePFFJPEGHeaders(data); }
					}
				}
				
			} else if (type == 'offset') {
				if (targetViewer.tileSourceMultiple === null) {
					if (targetViewer.tileSource == 'ZoomifyZIFFile') {
						targetViewport.parseZIFOffsetChunk(data, chunkNumber);
					} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
						targetViewport.parsePFFOffsetChunk(data, chunkNumber);
					}
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (targetViewer.tileSource == 'ZoomifyZIFFile') {
							if (vpID == i) { targetViewer['Viewport' + i.toString()].parseZIFOffsetChunk(data, chunkNumber); }
						} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
							if (vpID == i) { targetViewer['Viewport' + i.toString()].parsePFFOffsetChunk(data, chunkNumber); }
						}
					}
				}
				
			} else if (type == 'byteCount') {
				// DEV NOTE: PFFs byte counts are handled through offset codeflow due to legacy implementation.
				if (targetViewer.tileSourceMultiple === null) {
					targetViewport.parseZIFByteCountChunk(data, chunkNumber);
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (vpID == i) { targetViewer['Viewport' + i.toString()].parseZIFByteCountChunk(data, chunkNumber); }
					}
				}
			} else if (type.substring(0,5) == 'image') {
				imagesLoading--;
				if (targetViewer.tileSourceMultiple === null) {
					if (targetViewer.tileSource == 'ZoomifyZIFFile') {
						targetViewport.parseZIFImage(data, tile, type);
					} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
						targetViewport.parsePFFImage(data, tile, type);
					}
				} else {					
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (targetViewer.tileSource == 'ZoomifyZIFFile') {
							if (vpID == i) { targetViewer['Viewport' + i.toString()].parseZIFImage(data, tile, type); }
						} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
							if (vpID == i) { targetViewer['Viewport' + i.toString()].parsePFFImage(data, tile, type); }
						}
					}
				}
				
			} else if (type == 'navigator') {
				if (targetViewer.tileSourceMultiple === null) {
					if (targetViewer.tileSource == 'ZoomifyZIFFile') {
						targetViewport.parseZIFImage(data, tile, type);
					} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
						targetViewport.parsePFFImage(data, tile, type);
					}
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (targetViewer.tileSource == 'ZoomifyZIFFile') {
							if (vpID == i) { targetViewer['Viewport' + i.toString()].parseZIFImage(data, tile, type); }
						} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
							if (vpID == i) { targetViewer['Viewport' + i.toString()].parsePFFImage(data, tile, type); }
						}
					}
				}
			} else if (type == 'gallery') {
				if (targetViewer.tileSourceMultiple === null) {
					if (targetViewer.tileSource == 'ZoomifyZIFFile') {
						targetViewport.parseZIFImage(data, tile, type);
					} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
						targetViewport.parsePFFImage(data, tile, type);
					}
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (targetViewer.tileSource == 'ZoomifyZIFFile') {
							if (vpID == i) { targetViewer['Viewport' + i.toString()].parseZIFImage(data, tile, type); }
						} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
							if (vpID == i) { targetViewer['Viewport' + i.toString()].parsePFFImage(data, tile, type); }
						}
					}
				}
			} else {
				if (targetViewer.tileSource == 'ZoomifyZIFFile') {
					targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ZIFBYTES'), false, targetViewer.messageDurationShort, 'center');
				} else if (targetViewer.tileSource == 'ZoomifyPFFFile') {
					targetViewer.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-PFFBYTES'), false, targetViewer.messageDurationShort, 'center');
				}
			}
		}
	}

	// Current implementation creates XML from received JSON and passes image properties back to Viewer to reenter image loading process.
	function validateJSON (jsonText, vpID, iiifInfo) {
		var jsonObject = null;
		try {
			jsonObject = JSON.parse(jsonText);
		} catch (e) {
			targetViewer.showMessage(e.name + Z.Utils.getResource('ERROR_PARSINGANNOTATIONSJSONFILE') + e.message);
		}

		if (jsonObject) {
			var targetViewport = (typeof vpID === 'undefined' || vpID === null || vpID == 0) ? targetViewer['Viewport'] : targetViewer['Viewport' + vpID.toString()];

			if (iiifInfo) {
				targetViewer.iiifInfoJSONObject = jsonObject;
				var xmlText = '<IMAGE_PROPERTIES WIDTH="' + jsonObject.width + '" HEIGHT="' + jsonObject.height + '" />'
				var xmlDoc = Z.Utils.xmlConvertTextToDoc(xmlText);
				if (targetViewer.tileSourceMultiple === null) {
					targetViewport.parseImageXML(xmlDoc);
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (vpID == i) { targetViewer['Viewport' + i.toString()].parseImageXML(xmlDoc); }
					}
				}

			} else if (targetViewer.overlays) {
				targetViewer.overlayJSONObject = jsonObject;
				var xmlText = Z.Utils.jsonConvertObjectToXMLText(jsonObject);
				var xmlDoc = Z.Utils.xmlConvertTextToDoc(xmlText);
				targetViewer.parseImageSetXML(xmlDoc, 'overlay');

			} else {
				targetViewer.annotationJSONObject = jsonObject;
				var xmlText = Z.Utils.jsonConvertObjectToXMLText(jsonObject);
				var xmlDoc = Z.Utils.xmlConvertTextToDoc(xmlText);
				if (targetViewer.tileSourceMultiple === null) {
					targetViewport.parseAnnotationsXML(xmlDoc);
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (vpID == i) { targetViewer['Viewport' + i.toString()].parseAnnotationsXML(xmlDoc); }
					}
				}
			}
		}
	}

	function validateXML (xmlDoc, vpID) {
		if (xmlDoc && xmlDoc.documentElement) {
			var targetViewport = (typeof vpID === 'undefined' || vpID === null || vpID == 0) ? targetViewer['Viewport'] : targetViewer['Viewport' + vpID.toString()];

			var rootName = xmlDoc.documentElement.tagName;
			if (targetViewer.xmlParametersParsing) {
				targetViewer.parseParametersXML(xmlDoc);
			} else if (rootName == 'USERDATA') {
				// Get username list for login validation.
				targetViewer.parseUsersXML(xmlDoc);
			} else if (rootName == 'COPYRIGHT') {
				// Get text for copyright display.
				var cStatementText = xmlDoc.documentElement.getAttribute('STATEMENTTEXT');
				var cDeclinedText = xmlDoc.documentElement.getAttribute('DECLINEDTEXT');
				if (Z.Utils.stringValidate(cStatementText)) {
					targetViewer.showCopyright(cStatementText, cDeclinedText);
				} else {
					targetViewer.showMessage(Z.Utils.getResource('ERROR_IMAGEXMLINVALID'), true);
				}
			} else if ((rootName == 'IMAGE_PROPERTIES') || (rootName == 'ZIFHEADER') || (rootName == 'PFFHEADER') || (rootName == 'Image')) { // 'Image' is root of DZI xml.
				// Pass received image properties XML from file, folder, or other tilesource back to Viewer to reenter image loading process.
				if ((targetViewer.tileSource == 'ZoomifyZIFFile') || (targetViewer.tileSource == 'ZoomifyImageFolder') || (targetViewer.tileSource == 'ZoomifyPFFFile') || (targetViewer.tileSource == 'DZIFolder') || (targetViewer.tileSource == 'ImageServer')) {
					if (targetViewer.imagePath != "multiple") {
						targetViewport.parseImageXML(xmlDoc);
					} else {
						for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
							if (vpID == i) { targetViewer['Viewport' + i.toString()].parseImageXML(xmlDoc); }
						}
					}

					// Debug option: Offset a viewport's position relative to others see it more easily.
					//if (vpID == 0) { targetViewer.Viewport0.setSizeAndPosition(900, 550, 150, 0); }
				}
			} else if (rootName == 'PFFOFFSET') {
				// Pass received chunk offset data back to Viewer to reenter tile loading process.
				if (targetViewer.imagePath != "multiple") {
					targetViewport.parsePFFOffsetChunkServlet(xmlDoc);
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (vpID == i) { targetViewer['Viewport' + i.toString()].parsePFFOffsetChunkServlet(xmlDoc); }
					}
				}
			} else if (rootName == 'SKINDATA') {
				// Pass received skin data back to Viewer.
				if (typeof targetViewer.xmlCallbackFunction === 'function') {
					targetViewer.xmlCallbackFunction(xmlDoc);
				} else if (targetViewer.Toolbar) {
					targetViewer.Toolbar.parseSkinXML(xmlDoc);
				}
			} else if (rootName == 'GEODATA') {
				targetViewport.parseGeoCoordinatesXML(xmlDoc);
			} else if (rootName == 'IMAGELISTDATA') {
				// Pass received image list XML back to Viewer to reenter annotation loading process.
				if (targetViewer.tileSourceMultiple === null) {
					targetViewport.parseImageListXML(xmlDoc);
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (vpID == i) { targetViewer['Viewport' + i.toString()].parseImageListXML(xmlDoc, vpID); }
					}
				}
			} else if (rootName == 'SLIDEDATA') {
				// Pass received slides XML back to Viewer to reenter slide loading process.
				targetViewport.parseSlidesXML(xmlDoc);
			} else if (rootName == 'HOTSPOTDATA') {
				// Pass received hotspot XML back to Viewer to reenter hotspot loading process.
				if (targetViewer.tileSourceMultiple === null) {
					targetViewport.parseHotspotsXML(xmlDoc);
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (vpID == i) { targetViewer['Viewport' + i.toString()].parseHotspotsXML(xmlDoc); }
					}
				}
			} else if (rootName == 'ZAS') {
				// Pass received annotation XML back to Viewer to reenter annotation loading process.
				if (targetViewer.tileSourceMultiple === null) {
					targetViewport.parseAnnotationsXML(xmlDoc);
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (vpID == i) { targetViewer['Viewport' + i.toString()].parseAnnotationsXML(xmlDoc, vpID); }
					}
				}
			} else if (rootName == "COMPARISONDATA") {
				// Pass received image set XML back to Viewer to reenter image set loading process.
				if (targetViewer) { targetViewer.parseImageSetXML(xmlDoc, 'comparison'); }
			} else if (rootName == "OVERLAYDATA") {
				// Pass received image set XML back to Viewer to reenter image set loading process.
				if (targetViewer) { targetViewer.parseImageSetXML(xmlDoc, 'overlay'); }
			} else if (rootName == "ANIMATIONDATA") {
				// Pass received image set XML back to Viewer to reenter image set loading process.
				if (targetViewer) { targetViewer.parseImageSetXML(xmlDoc, 'animation'); }
			} else if (rootName == "SLIDESTACKDATA") {
				// Pass received image set XML back to Viewer to reenter image set loading process.
				if (targetViewer) { targetViewer.parseImageSetXML(xmlDoc, 'slidestack'); }
			} else if (rootName == "TRACKINGDATA") {
				// Pass received tracking XML back to Viewer to reenter tracking panel loading process.
				if (targetViewer.tileSourceMultiple === null) {
					targetViewport.parseTrackingXML(xmlDoc);
				} else {
					for (var i = 0, j = targetViewer.imageSetLength; i < j; i++) {
						if (vpID == i) { targetViewer['Viewport' + i.toString()].parseTrackingXML(xmlDoc, vpID); }
					}
				}
			} else if (targetViewer.postingImage) {
				targetViewer.showMessage(Z.Utils.getResource('ERROR_SAVEIMAGEHANDLERPATHINVALID'), true);
			} else {
				// Is there a problem here saving to image file or only and xml error because missing a condition specific to a different error?
				//console.log(Z.Utils.xmlConvertDocToText(xmlDoc));
				targetViewer.showMessage(Z.Utils.getResource('ERROR_XMLINVALID'), true);
			}
		} else {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_XMLDOCINVALID'), true);
		}
	}

	this.loadImage = function (src, callback, contentType, tile, vpID) {
		loadImage(src, callback, contentType, tile, vpID);
	}

	function loadImage (src, callback, contentType, tile, vpID) {
		if (imagesLoading < IMAGES_LOADING_MAX) {
			imagesLoading++;					
			if ((targetViewer.tileSource == 'ZoomifyZIFFile' || (targetViewer.tileSource == 'ZoomifyPFFFile' && targetViewer.tileHandlerPathFull === null)) && ((typeof tile !== 'undefined' && tile !== null) || contentType == 'navigator')) {
				loadImageByteRange(src, contentType, tile, vpID);				
			} else {
				var func = Z.Utils.createCallback(null, onComplete, callback);
				var imageNetRequest = new ImageNetRequest(src, func, contentType);
				imageNetRequest.start();
			}
			return true;

		} else {
			var index = Z.Utils.arrayIndexOfObjectValue(loadImageQueue, 'sc', src);
			if (index == -1) {
				loadImageQueue[loadImageQueue.length] = { sc:src, cb:callback, ct:contentType, t:tile };
				// Debug option: console.log('Adding to queue: ' + tile.name + '  Queue length: ' + loadImageQueue.length);
				if (!loadImageQueueInterval) {
					loadImageQueueInterval = window.setInterval( function() { loadImagesFromQueue(); }, loadImageQueueDelay);
				}
			}
			return false;
		}
	}

	function loadImagesFromQueue () {
		var qNext = loadImageQueue[0];
		var loadingImage = loadImage(qNext.sc, qNext.cb, qNext.ct, qNext.t);
		if (loadingImage) { loadImageQueue = Z.Utils.arraySplice(loadImageQueue, 0, 1); }
		if (loadImageQueue.length == 0 && loadImageQueueInterval) {
			window.clearInterval(loadImageQueueInterval);
			loadImageQueueInterval = null;
		}
	}

	function onComplete (callback, src, img) {
		imagesLoading--;
		if (typeof callback === 'function') {
			try {
				callback(img);
			} catch (e) {
				targetViewer.showMessage(e.name + Z.Utils.getResource('ERROR_EXECUTINGCALLBACK') + src + ' ' + e.message, true);
			}
		}
	}

	function ImageNetRequest (src, callback, contentType) {
		var image = null;
		var timeout = null;
		this.start = function () {
			image = new Image();
			var successFunction = function () { complete(true); };
			var errorFunction = function () { complete(false); };

			var timeoutFunc = function () {
				// Debug option: Append source data to error message below: + ': ' + src);
				console.log(Z.Utils.getResource('ERROR_IMAGEREQUESTTIMEDOUT')); // Options for showMessage:, false, targetViewer.messageDurationShort, 'center');
				complete(false);

				targetViewer.Viewport.traceDebugValues('imageRequestTimeout', contentType + ' timeout: ' + src);
			};

			image.onload = successFunction;
			image.onabort = errorFunction;
			image.onerror = errorFunction;
			timeout = window.setTimeout(timeoutFunc, IMAGE_LOAD_TIMEOUT);
			image.src = src;
		};

		function complete (result) {
			image.onload = null;
			image.onabort = null;
			image.onerror = null;
			if (timeout) { window.clearTimeout(timeout); }
			window.setTimeout(function () { callback(src, result ? image : null); }, 1);
		};
	}
};



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::::::::::::::::::::::::::::::::::: UTILITY FUNCTIONS :::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.Utils = {

	addCrossBrowserEvents : function () {
		// Meta events model is used only to ensure consistent event listener methods.
		// Specific browser differences are managed within each event handler.
		if (document.addEventListener) {
			// W3C DOM 2 Events model

			this.addEventListener = function (target, eventName, handler) {
				if (target) {
					if (eventName == 'mousewheel') { target.addEventListener('DOMMouseScroll', handler, false); }
					if (typeof handler == 'string') {
						console.log(handler);
						//console.log(arguments.callee.caller.toString());
						//vwrIntID, listID, listTitle, dataProvider, lis
					}
					target.addEventListener(eventName, handler, false);
				}
			};

			this.removeEventListener = function (target, eventName, handler) {
				if (target) {
					if (eventName == 'mousewheel') { target.removeEventListener('DOMMouseScroll', handler, false); }
					target.removeEventListener(eventName, handler, false);
				}
			};

			this.event = function (event) {
				return event;
			};

			this.target = function (event) {
				return event.target;
			};

			this.relatedTarget = function (event) {
				return event.relatedTarget;
			};

			this.isRightMouseButton = function (event) {
				var rightButton = false;
				if (event.which == 2 || event.which == 3) { rightButton = true; }
				return rightButton;
			};

			this.preventDefault = function (event) {
				event.preventDefault();
			};

			this.stopPropagation = function (event) {
				event.stopPropagation();
			};

		} else if (document.attachEvent) {
			// Internet Explorer Events model

			this.addEventListener = function (target, eventName, handler) {
				if (this._findListener(target, eventName, handler) != -1) return; // Prevent redundant listeners (DOM 2).
				var handler2 = function () {
					// IE version-specific listener (method of target, event object global)
					var event = window.event;
					if (Function.prototype.call) {
						handler.call(target, event);
					} else {
						target._currentListener = handler;
						target._currentListener(event)
						target._currentListener = null;
					}
				};
				target.attachEvent('on' + eventName, handler2);
				// Object supports cleanup
				var listenerRecord = {
					target: target,
					eventName: eventName,
					handler: handler,
					handler2: handler2
				};
				var targetDoc = target.document || target; // Get window object reference containing target.
				var targetWin = targetDoc.parentWindow;
				var listenerId = 'l' + this._listenerCounter++; // Create unique ID
				if (!targetWin._allListeners) { targetWin._allListeners = {}; } // Record listener in window object.
				targetWin._allListeners[listenerId] = listenerRecord;
				if (!target._listeners) { target._listeners = [];} // Record listener ID in target.
				target._listeners[target._listeners.length] = listenerId;
				if (!targetWin._unloadListenerAdded) {
					targetWin._unloadListenerAdded = true;
					targetWin.attachEvent('onunload', this._removeAllListeners); // Ensure listener cleanup on unload.
				}
			};

			this.removeEventListener = function (target, eventName, handler) {
				if (target) {
					var listenerIndex = this._findListener(target, eventName, handler); // Verify listener added to target.
					if (listenerIndex == -1) { return; }
					var targetDoc = target.document || target; // Get window object reference containing target.
					var targetWin = targetDoc.parentWindow;
					var listenerId = target._listeners[listenerIndex]; // Get listener in window object.
					var listenerRecord = targetWin._allListeners[listenerId];
					target.detachEvent('on' + eventName, listenerRecord.handler2); // Remove listener. Remove ID from target.
					target._listeners = Z.Utils.arraySplice(target._listeners, listenerIndex, 1);
					delete targetWin._allListeners[listenerId]; // Remove listener record from window object.
				}
			};

			this.event = function (event) {
				return window.event;
			};

			this.target = function (event) {
				return event.srcElement;
			};

			this.relatedTarget = function (event) {
				var relTarg = null;
				if (event.type == 'mouseover') {
					relTarg = event.fromElement;
				} else if (event.type == 'mouseout') {
					relTarg = event.toElement;
				}
				return relTarg;
			};

			this.isRightMouseButton = function (event) {
				var rightButton = false;
				if (event.button == 2) { rightButton = true; }
				return rightButton;
			};

			this.preventDefault = function (event) {
				if (event) { event.returnValue = false; }
			};

			this.stopPropagation = function (event) {
				event.cancelBubble = true;
			};

			this._findListener = function (target, eventName, handler) {
				var listeners = target._listeners; // Get array of listener IDs added to target.
				if (!listeners) { return -1; }
				var targetDoc = target.document || target; // Get window object reference containing target.
				var targetWin = targetDoc.parentWindow;
				for (var i = listeners.length - 1; i >= 0; i--) {
					// Find listener (backward search for faster onunload).
					var listenerId = listeners[i]; // Get listener's ID from target.
					var listenerRecord = targetWin._allListeners[listenerId]; // Get listener record from window object.
					// Compare eventName and handler with the retrieved record.
					if (listenerRecord && listenerRecord.eventName == eventName && listenerRecord.handler == handler) { return i; }
				}
				return -1;
			};

			this._removeAllListeners = function () {
				var targetWin = this;
				for (id in targetWin._allListeners) {
					var listenerRecord = targetWin._allListeners[id];
					listenerRecord.target.detachEvent('on' + listenerRecord.eventName, listenerRecord.handler2);
					delete targetWin._allListeners[id];
				}
			};

			this._listenerCounter = 0;
		}
	},
	
	addCrossBrowserFunctions : function () {
		// Meta methods are used to ensure consistent functional support.  Specific browser
		// differences are managed within each event handler.
		if (document.addEventListener) {
			// Methods required for missing W3C DOM functionality

			this.disableTextInteraction = function (tN) {
				if (tN) {
					var tnS = tN.parentNode.style;
					if (tnS) {
						tN.parentNode.unselectable = 'on'; // For IE and Opera
						tnS.userSelect = 'none';
						tnS.MozUserSelect = 'none';
						tnS.webkitUserSelect = 'none';
						tnS.webkitTouchCallout = 'none';
						tnS.webkitTapHighlightColor = 'transparent';
					}
				}
			};

			this.renderQuality = function (image, quality) {
				if (quality) {
					var rndrQuality = (quality == 'high') ? 'optimizeQuality' : 'optimizeSpeed';
					image.style.setProperty ('image-rendering', rndrQuality, null);
				}
			};

			this.setOpacity = function (element, value, altColor) {
				if (Z.alphaSupported) {
					element.style.opacity=value;
				} else if (altColor) {
					element.style.backgroundColor = altColor;
				}
			};

		} else if (document.attachEvent) {
			// Methods required for missing Internet Explore functionality

			this.disableTextInteraction = function (tN) {
				if (tN) {
					tN.parentNode.unselectable = 'on';
					tN.parentNode.onselectstart = function () { return false; };
				}
			};

			this.renderQuality = function (image, quality) {
				if (quality) {
					var rndrQuality = (quality == 'high') ? 'bicubic' : 'nearest-neighbor';
					image.style.msInterpolationMode = rndrQuality;
				}
			};

			this.setOpacity = function (element, value, altColor) {
				if (Z.alphaSupported) {
					value *= 100; // IE uses range of 1 to 100 rather than 0.1 to 1.
					element.style.zoom = 1; // Workaround to enable alpha support for elements not positioned.
					element.style.filter = 'progid:DXImageTransform.Microsoft.Alpha(Opacity=' + value + ')'; // IE8
					element.style.filter = 'alpha(opacity=' + value + ')'; // IE7, 6

					// Next line is workaround for IE problem with overwriting right and bottom borders of div where
					// overflow is set to 'hidden' but content's filter is set to value=100 in the two filter lines above.
					if (value == 100) { element.style.filter = ''; }

				} else if (altColor) {
					element.style.backgroundColor = altColor;
				}
			};
		}
	},
	
	declareZoomifyGlobals : function () {
		// VIEWER instance counter.
		Z.viewerCounter = 0;
		Z.multipleViewers = false;
		
		// PAGE & BROWSER variables shared across Viewer instances.
		Z.browsers = null;
		Z.browser = null;
		Z.browserVersion = null;
		Z.scaleThreshold = null;
		Z.canvasSupported = null;
		Z.cssTransformsSupported = null;
		Z.cssTransformProperty = null;
		Z.cssTransformNoUnits = null;
		Z.alphaSupported = null;
		Z.renderQuality = null;
		Z.rotationSupported = null;
		Z.fullScreenSupported = null;
		Z.arrayMapSupported = null;
		Z.arraySpliceSupported = null;
		Z.float32ArraySupported = null;
		Z.uInt8ArraySupported = null;		
		Z.localUseSupported = null;
		Z.localUseEnabled = null;
		Z.localFileSelected = null;
		Z.localFileData = null;
		Z.singleFileSupported = null;
		Z.singleFileEnabled = null;	
		Z.xmlHttpRequestSupport = null;
		Z.definePropertySupported = null;
		Z.responseArraySupported = null;
		Z.responseArrayPrototyped = false;
		Z.touchSupport = null;
		Z.gestureSupport = null;
		Z.mobileDevice = null;
		Z.cacheProofCounter = 0;
	},

	detectBrowserFeatures : function () {
		// Detect browser and version.
		Z.browsers = { UNKNOWN: 0, IE: 1, FIREFOX: 2, SAFARI: 3, CHROME: 4, OPERA: 5, EDGE: 6 };
		var browser = Z.browsers.UNKNOWN;
		var browserVersion = 0;
		var scaleThreshold = 10000; // Safe value set, actual value may be 1M.
		var app = navigator.appName;
		var ver = navigator.appVersion;
		var msInterpolationMode = false;
		var gwkRenderingMode = false;
		var ua = navigator.userAgent.toLowerCase();

		if (ua.indexOf('edge') != -1) {
			browser = Z.browsers.EDGE;
			browserVersion = ver;
		} else if (app == 'Microsoft Internet Explorer' && !! window.attachEvent && !! window.ActiveXObject) {
			var ieOffset = ua.indexOf('msie');
			browser = Z.browsers.IE;
			browserVersion = parseFloat(ua.substring(ieOffset + 5, ua.indexOf(';', ieOffset)));
			msInterpolationMode = (typeof document.documentMode !== 'undefined');
		} else if (app == 'Netscape' && ua.indexOf('trident') != -1) {
			browser = Z.browsers.IE;
			browserVersion = 11;
		} else if (app == 'Netscape' && !! window.addEventListener) {
			var idxFF = ua.indexOf('firefox');
			var idxSA = ua.indexOf('safari');
			var idxCH = ua.indexOf('chrome');
			if (idxFF >= 0) {
				browser = Z.browsers.FIREFOX;
				browserVersion = parseFloat(ua.substring(idxFF + 8));
				scaleThreshold = 10000; // Safe value set, actual value may be 100,000.
			} else if (idxSA >= 0) {
				var slash = ua.substring(0, idxSA).lastIndexOf('/');
				browser = (idxCH >= 0) ? Z.browsers.CHROME : Z.browsers.SAFARI;
				browserVersion = parseFloat(ua.substring(slash + 1, idxSA));
				scaleThreshold = 10000;
			}
			var testImage = new Image();
			if (testImage.style.getPropertyValue) { gwkRenderingMode = testImage.style.getPropertyValue ('image-rendering'); }
		} else if (app == 'Opera' && !! window.opera && Object.prototype.toString.call(window.opera) == '[object Opera]') {
			browser = Z.browsers.OPERA;
			browserVersion = parseFloat(ver);
		}
		
		// Detect local file access support.
		var localFilesSupported = (window.File && window.FileReader && window.Blob);
	
		// Detect network request support
		var xmlHttpRequestSupport;
		if (window.XMLHttpRequest) {
			netReq = new XMLHttpRequest();
			xmlHttpRequestSupport = 'XMLHttpRequest';
		} else if (window.ActiveXObject) {
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
		}

		var responseArraySupported = ('response' in XMLHttpRequest.prototype || 'mozResponseArrayBuffer' in XMLHttpRequest.prototype || 'mozResponse' in XMLHttpRequest.prototype || 'responseArrayBuffer' in XMLHttpRequest.prototype);

		// Detect Canvas support.
		var elem = document.createElement('canvas');
		var canvasSupportPresent = !!(elem.getContext && elem.getContext('2d'));
		var canvasSuppSubpix = !((browser == Z.browsers.SAFARI && browserVersion < 4) || (browser == Z.browsers.CHROME && browserVersion < 2));
		var canvasSupported = canvasSupportPresent && canvasSuppSubpix;
		var alphaSupported = !(browser == Z.browsers.CHROME && browserVersion < 2);
		var renderQuality = (msInterpolationMode || gwkRenderingMode) ? 'high' : null;

		// Detect transform support - for rotation and non-canvas tile placement.
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
		var rotationSupported = cssTransformsSupported;

		// Detect touch event support - enable touch event handlers but do not disable mouse event handlers.
		var touchSupport = (('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));

		// Detect mobile device - affects pan buffer size, buttons sizes, zoom step size, label scaling step size, label control point size, and whether some errors are presented as messages in the user display are in the developer console.
		var iOSDevice = (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('ipod') > -1);
		var mobileDevice = (ua.indexOf('android') > -1 || iOSDevice);

		// Detect fullscreen support - native and vendor.
		var fullScreenSupported = false;
		 if (typeof document.cancelFullScreen !== 'undefined'
			|| typeof document.webkitCancelFullScreen !== 'undefined'
			|| typeof document.mozCancelFullScreen !== 'undefined'
			|| typeof document.oCancelFullScreen !== 'undefined'
			|| typeof document.msCancelFullScreen !== 'undefined'
			|| typeof document.msExitFullscreen !== 'undefined') {
			fullScreenSupported = true;
		}

		// Detect array support, type, and property support.
		var arrayMapSupported = Array.prototype.map;
		var arraySpliceSupported = Array.prototype.splice;
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

		// Detect local file access - alert users of Chrome/Opera/IE11 (folders) and ZIF/PFF (all browsers).
		var localUseEnabled;
		switch (window.location.protocol) {
			case 'http:':
				localUseEnabled = false;
				break;
			case 'https:':
				localUseEnabled = false;
				break;
			case 'file:':
				localUseEnabled = true;
				break;
			default:
				localUseEnabled = null;
				break;
		}

		// Detect browser use not supporting single file storage. Access not supported on IE <= v8 and Opera <= v12 and most pre-canvas browsers.
		// Numerous browsers with limited adoption not tested and functional failures will present specific errors rather than general ZIF support message.
		var singleFileSupported = !((Z.browser == Z.browsers.IE && Z.browserVersion < 9) || (Z.browser == Z.browsers.OPERA && Z.browserVersion < 15) || (Z.browser == Z.browsers.CHROME && Z.browserVersion < 25) && (Z.browser == Z.browsers.FIREFOX && Z.browserVersion < 20) && (Z.browser == Z.browsers.SAFARI && Z.browserVersion < 5));

		// Set global variables.
		Z.browser = browser;
		Z.browserVersion = browserVersion;
		Z.scaleThreshold = scaleThreshold;		
		Z.localUseSupported = localFilesSupported;
		Z.xmlHttpRequestSupport = xmlHttpRequestSupport;
		Z.responseArraySupported = responseArraySupported;
		Z.canvasSupported = canvasSupported;
		Z.useCanvas = Z.canvasSupported;  // Can be overridden by false zCanvas parameter.
		Z.imageFilters = (!Z.useCanvas && Z.imageFilters) ? false : Z.imageFilters;
		Z.cssTransformsSupported = cssTransformsSupported;
		Z.cssTransformProperty = cssTransformProperty;
		Z.cssTransformNoUnits = cssTransformNoUnits;
		Z.alphaSupported = alphaSupported;
		Z.renderQuality = renderQuality;
		Z.rotationSupported = rotationSupported;
		Z.fullScreenSupported = fullScreenSupported;
		Z.arrayMapSupported = arrayMapSupported;
		Z.arraySpliceSupported = arraySpliceSupported;
		Z.float32ArraySupported = float32ArraySupported;
		Z.uInt8ArraySupported = uInt8ArraySupported;
		Z.definePropertySupported = definePropertySupported;
		Z.touchSupport = touchSupport;
		Z.gestureSupport = iOSDevice && touchSupport;
		Z.mobileDevice = mobileDevice;
		Z.localUseEnabled = localUseEnabled;
		Z.singleFileSupported = singleFileSupported;
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::: PARAMETER & RESOURCE UTILITY FUNCTIONS ::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	parseParameters : function (params) {
		var parsedParams = [];
		if (typeof params === 'object') {
			parsedParams = params;
		} else if (typeof params === 'string') {
			var splitParams = params.split('&');
			for (var i = 0, j = splitParams.length; i < j; i++) {
				var nameValuePair = splitParams[i];
				var sep = nameValuePair.indexOf('=');
				if (sep > 0) {
					var pName = nameValuePair.substring(0, sep);
					var pValue = nameValuePair.substring(sep + 1);
					parsedParams[pName] = pValue;
				}
			}
		}
		return parsedParams;
	},

	parametersToDelimitedString : function (params, delimiter) {
		var outputString = '';
		for (var pName in params) {
			outputString += pName + '=' + params[pName].toString() + delimiter;
		}
		outputString = outputString.slice(0, - 1);
		return outputString;
	},

	readCookie : function (name) {
		var nameEq = name + '=';
		var nameValuePairs = document.cookie.split(';');
		for (var i = 0, j = nameValuePairs.length; i < j; i++) {
			var nvP = nameValuePairs[i];
			while (nvP.charAt(0) == ' ') { nvP = nvP.substring(1,nvP.length); }
			if (nvP.indexOf(nameEq) == 0) { return nvP.substring(nameEq.length,nvP.length); }
		}
		return null;
	},

	getResource : function (resName) {
		// Access default values, constants, and localizable strings (tooltips, messages, errors).
		var resTxt = '';
		switch(resName) {
			case 'DEFAULT_EXPRESSPARAMETERSENABLETEST' :
				// Use 'Enable Express parameters' to enable Express parameter support and value of DEFAULT_EXPRESSPARAMETERSDISABLEVALUE to disable.
				resTxt = 'Enable Express parameters';
				//resTxt = 'Changing This Violates License Agreement';
				break;
			case 'DEFAULT_EXPRESSPARAMETERSDISABLEVALUE' :
				resTxt = 'Changing This Violates License Agreement';
				break;
			case 'DEFAULT_EXPRESSPARAMETERSDISABLEDALERT' :
				resTxt = 'Support for this parameter is enabled only in the Zoomify Image Viewer included in the Zoomify HTML5 Express, Pro, and Enterprise editions: ';
				break;

			case 'DEFAULT_PROPARAMETERSENABLETEST' :
				// Use 'Enable Pro parameters' to enable Pro parameter support and value of DEFAULT_PARAMETERSDISABLEVALUE to disable.
				//resTxt = 'Enable Pro parameters';
				resTxt = 'Changing This Violates License Agreement';
				break;
			case 'DEFAULT_PROPARAMETERSDISABLEVALUE' :
				resTxt = 'Changing This Violates License Agreement';
				break;
			case 'DEFAULT_PROPARAMETERSDISABLEDALERT' :
				resTxt = 'Support for this parameter is enabled only in the Zoomify Image Viewer included in the Zoomify HTML5 Pro and Enterprise editions: ';
				break;

			case 'DEFAULT_SPECIALSTORAGESUPPORTENABLETEST' :
				// Use 'Enable special storage support' to enable Enterprise PFF and other special storage support and value of DEFAULT_SPECIALSTORAGESUPPORTDISABLEVALUE to disable.
				resTxt = 'Enable special storage support';
				//resTxt = 'Changing this violates License Agreement';
				break;
			case 'DEFAULT_SPECIALSTORAGESUPPORTDISABLEVALUE' :
				resTxt = 'Changing this violates License Agreement';
				break;
			case 'DEFAULT_SPECIALSTORAGESUPPORTDISABLEDALERT' :
				resTxt = 'Support for Zoomify Image File (PFF) storage and other special storage options is enabled only in the Zoomify Image Viewer included in the Zoomify HTML5 Enterprise edition.';
				break;

			case 'DEFAULT_ENTERPRISEPARAMETERSENABLETEST' :
				// Use 'Enable Enterprise parameters' to enable Enterprise parameter support and value of DEFAULT_ENTERPRISEPARAMETERSDISABLEVALUE to disable.
				//resTxt = 'Enable Enterprise parameters';
				resTxt = 'Changing this violates License Agreement';
				break;
			case 'DEFAULT_ENTERPRISEPARAMETERSDISABLEVALUE' :
				resTxt = 'Changing this violates License Agreement';
				break;
			case 'DEFAULT_ENTERPRISEPARAMETERSDISABLEDALERT' :
				resTxt = 'Support for this parameter is enabled only in the Zoomify Image Viewer included in the Zoomify HTML5 Enterprise edition: ';
				break;

			case 'DEFAULT_PARAMETERLISTTEXT' :
				resTxt = 'zAnimationAxis,zAnimationFlip,zAnimationPath,zAnimator,zAnnotationJSONObject,zAnnotationPanelVisible,zAnnotationPath,zAnnotationSort,zAnnotationXMLAperioLoad,zAnnotationXMLAperioPost,zAnnotationXMLText,zAnnotationsAddMultiple,zAnnotationsAutoSave,zAutoResize,zBaseZIndex,zBlurrinessVisible,zBookmarksGet,zBookmarksSet,zBrightnessVisible,zCanvas,zCaptionBackColor,zCaptionBackVisible,zCaptionBoxes,zCaptionOffset,zCaptionPosition,zCaptionTextColor,zCaptionTextVisible,zClickPan,zClickURLEntryVisible,zClickZoom,zColorBlueRangeVisible,zColorBlueVisible,zColorGreenRangeVisible,zColorGreenVisible,zColorRedRangeVisible,zColorRedVisible,zComparisonPath,zConstrainPan,zContrastVisible,zCoordinatesVisible,zCopyrightPath,zCrosshairsVisible,zDebug,zDoubleClickDelay,zDoubleClickZoom,zEdgesVisible,zEditMode,zEqualizeVisible,zFadeInSpeed,zFieldOfViewVisible,zFileHandlerPath,zFocal,zFreehandVisible,zFullPageVisible,zFullScreenVisible,zFullViewVisible,zGalleryHeight,zGalleryLeft,zGalleryPosition,zGalleryTop,zGalleryVisible,zGalleryWidth,zGammaBlueVisible,zGammaGreenVisible,zGammaRedVisible,zGammaVisible,zGeoCoordinatesPath,zGrayscaleVisible,zHelpHeight,zHelpLeft,zHelpPath,zHelpTop,zHelpVisible,zHelpWidth,zHideOverlayBackfill,zHotspotListTitle,zHotspotPath,zHotspotsDrawOnlyInView,zHueVisible,zIIIFFormat,zIIIFIdentifier,zIIIFPrefix,zIIIFQuality,zIIIFRegion,zIIIFRotation,zIIIFScheme,zIIIFServer,zIIIFSize,zImageFiltersVisible,zImageH,zImageListPath,zImageProperties,zImageSetSliderVisible,zImageW,zInitialFullPage,zInitialImageFilters,zInitialRotation,zInitialSync,zInitialTrackingOverlayVisible,zInitialX,zInitialY,zInitialZoom,zInteractive,zInversionVisible,zKeys,zLabelClickSelect,zLabelFillColor,zLabelFillVisible,zLabelHighlight,zLabelLineColor,zLabelLineVisible,zLabelShapesInternal,zLabelsClickDrag,zLightnessVisible,zLogoCustomPath,zLogoLinkURL,zLogoVisible,zMagnification,zMagnifierHeight,zMagnifierLeft,zMagnifierTop,zMagnifierVisible,zMagnifierWidth,zMarkupMode,zMaskBorder,zMaskClearOnUserAction,zMaskFadeSpeed,zMaskScale,zMaskVisible,zMaxZoom,zMeasureVisible,zMessagesVisible,zMinZoom,zMinimizeVisible,zMousePan,zMouseWheel,zNarrativeAnnotationFolderPath,zNarrativeImageFolderPath,zNarrativeMediaFolderPath,zNarrativeMode,zNarrativePath,zNavigatorFit,zNavigatorHeight,zNavigatorLeft,zNavigatorRectangleColor,zNavigatorTop,zNavigatorVisible,zNavigatorWidth,zNoPost,zNoPostDefaults,zNoiseVisible,zNormalizeVisible,zOnAnnotationReady,zOnReady,zOverlayJSONObject,zOverlayPath,zPanBuffer,zPanButtonsVisible,zPanSpeed,zPixelsPerUnit,zPolygonVisible,zPreloadVisible,zProgressVisible,zQuality,zRequestTiles,zResetVisible,zRotationVisible,zRulerHeight,zRulerLeft,zRulerListType,zRulerTop,zRulerVisible,zRulerWidth,zSaturationVisible,zSaveButtonVisible,zSaveHandlerPath,zSaveImageBackColor,zSaveImageCompression,zSaveImageFilename,zSaveImageFormat,zSaveImageFull,zSaveImageHandlerPath,zScreensaver,zScreensaverSpeed,zSepiaVisible,zServerIP,zServerPort,zShapeVisible,zSharpnessVisible,zSimplePath,zSkinPath,zSlideButtonsVisible,zSlideListTitle,zSlidePath,zSliderVisible,zSlidestackPath,zSmoothPan,zSmoothPanEasing,zSmoothPanGlide,zSmoothZoom,zSmoothZoomEasing,zSourceMagnification,zSyncVisible,zTextVisible,zThresholdVisible,zTileH,zTileHandlerPath,zTileSource,zTileW,zTilesPNG,zToolbarBackgroundVisible,zToolbarInternal,zToolbarPosition,zToolbarVisible,zTooltipsVisible,zTourListTitle,zTourPath,zTrackingAuto,zTrackingEditMode,zTrackingPanelVisible,zTrackingPath,zUnits,zUnitsPerImage,zUnsavedEditsTest,zUserLogin,zUserNamePrompt,zUserPanelVisible,zUserPath,zUsingDirectoryExtensions,zVirtualPointerPath,zVirtualPointerVisible,zWatermarkPath,zWhiteBalanceVisible,zXMLParametersPath,zZoomButtonsVisible,zZoomRectangle,zZoomSpeed';
				break;

			case 'DEFAULT_HEADERSTARTBYTE' :
				resTxt = '0';
				break;
			case 'DEFAULT_HEADERENDBYTEZIF' :
				resTxt = '8192';
				break;
			case 'DEFAULT_HEADERENDBYTEPFF' :
				resTxt = '1060';
				break;
			case 'DEFAULT_CHUNKSIZE' :
				// Number of offsets or byte counts to request when one is needed.  Offsets
				// are 8 bytes each while byte counts are 4 bytes each.
				resTxt = (Z.tileSource == 'ZoomifyZIFFile') ? '1024' : '256';
				break;

			case 'DEFAULT_TILEW' :
				resTxt = (Z.tileSource != 'IIIFImageServer') ? '256' : '512';
				break;
			case 'DEFAULT_TILEH' :
				resTxt = (Z.tileSource != 'IIIFImageServer') ? '256' : '512';
				break;
			case 'DEFAULT_IMAGESLOADINGMAX' :
				resTxt = '300';
				break;
			case 'DEFAULT_IMAGELOADTIMEOUT' :
				resTxt = '60000';	// 60 seconds.
				break;
			case 'DEFAULT_IMAGELOADQUEUEDELAY' :
				resTxt = '100';	// 1 tenth of a second.
				break;
			case 'DEFAULT_TIERSMAXSCALEUP' :
				resTxt = '1.15';
				break;
			case 'DEFAULT_TILESMAXCACHE' :
				// Alternative implementation: Reduce cache max on mobile devices. Currently not implemented because RAM less limited than bandwidth.
				//if (!Z.mobileDevice) {
					resTxt = '300';	// At average 10K / tile, average 3MB max cache - 30MB if stored uncompressed - plus whatever browser caches by default.
				//} else {
				//	resTxt = '50';	// At average 10K / tile, average 0.5MB max cache - 5MB if stored uncompressed - plus whatever browser caches by default.
				//}
				break;
			case 'DEFAULT_BACKFILLTHRESHOLD3' :
				resTxt = '6';
				break;
			case 'DEFAULT_BACKFILLDYNAMICADJUST' :
				resTxt = '3';
				break;
			case 'DEFAULT_BACKFILLTHRESHOLD2' :
				resTxt = '5';
				break;
			case 'DEFAULT_BACKFILLCHOICE2' :
				resTxt = '3';
				break;
			case 'DEFAULT_BACKFILLTHRESHOLD1' :
				resTxt = '3';
				break;
			case 'DEFAULT_BACKFILLCHOICE1' :
				resTxt = '2';
				break;
			case 'DEFAULT_BACKFILLCHOICE0' :
				resTxt = '0';
				break;
			case 'DEFAULT_PANBUFFER' :
				// Typical display area dimensions of 900 x 550 pixels requires 12 tiles (4 x 3)
				// if pan buffer set to 1 (no buffer), 24 tiles (6 x 4) if set to 1.5, and 40 (8 x 5)
				// if set to 2.  If zoomed between tiers needed tiles can double or triple (rare).
				resTxt = (!Z.mobileDevice) ? '1.5' : '1';
				break;
			case 'DEFAULT_PANBUFFERUNCONVERTED' :
				// Larger buffer area used if viewing unconverted image and not on mobile device. Buffer constrained in function
				// setSizeAndPosition based on Z.imageSet and whether browser is Firefox, general browser limit, and image size.
				resTxt = (!Z.mobileDevice) ? '10' : (Z.rotationVisible) ? '2' : '1';
				break;
			case 'DEFAULT_PAN_BUFFERSIZEMAXBROWSER' :
				resTxt = '10000';
				break;
			case 'DEFAULT_PAN_BUFFERSIZEMAXFIREFOX' :
				resTxt = '4000';
				break;
			case 'DEFAULT_PAN_BUFFERSIZEMAXMOBILE' :
				resTxt = '3000';
				break;
			case 'DEFAULT_PAN_BUFFERSIZEMAXIMAGESET' :
				resTxt = '1000';
				break;
			case 'DEFAULT_BACKFILLBUFFER' :
				// Implemented for images with 7 or more tiers where tier 3 backfill is insufficient to hide tile gaps and where deep zoom would
				// cause scaling of tier 3 to exceed maximum size supported by browsers. See additional notes in function scaleTierToZoom.
				reTxt = (!Z.mobileDevice) ? '2' : '1';
				break;
			case 'DEFAULT_CANVAS' :  // '0'=false, '1'=true.
				resTxt = '1';
				break;
			case 'DEFAULT_BASEZINDEX' :  // '2000' default, range -2147483648 to +2147483647. Locate affected Viewer elements by searching for variable Z.baseZIndex.
				resTxt = '2000';
				break;

			case 'DEFAULT_VALIDATEVIEWRETRYLIMIT' :
				resTxt = '2';
				break;
			case 'DEFAULT_VALIDATEVIEWRETRYDELAY' :
				resTxt = '1000';
				break;

			case 'DEFAULT_DEBUG' :  // '0'=disable, '1'=enable, '2'=enable with tile name labels and tracing, '3'=enable without tile names or tracing but with validate view tile loading values.
				resTxt = '0';
				break;

			case 'DEFAULT_MOUSECLICKTHRESHOLDVIEWPORT' :
				resTxt = 4;
				break;
			case 'DEFAULT_MOUSECLICKTHRESHOLDTIMEVIEWPORT' :
				resTxt = 500;
				break;
			case 'DEFAULT_MOUSECLICKTHRESHOLDHOTSPOT' :
				resTxt = 4;
				break;
			case 'DEFAULT_TOUCHTAPTHRESHOLDVIEWPORT' :
				resTxt = (!Z.mobileDevice) ? 4 : 6;
				break;
			case 'DEFAULT_TOUCHTAPTHRESHOLDTIMEVIEWPORT' :
				resTxt = 500;
				break;
			case 'DEFAULT_MOUSECLICKTHRESHOLDNAVIGATOR' :
				resTxt = 4;
				break;
			case 'DEFAULT_TOUCHTAPTHRESHOLDNAVIGATOR' :
				resTxt = (!Z.mobileDevice) ? 3 : 6;
				break;

			case 'DEFAULT_PANSPEED' :
				resTxt = '5'; // '1'=slow to '10'=fast, default is '5'.
				break;
			case 'DEFAULT_PANSTEPDISTANCE' :
				resTxt = '10'; // 5 * 10 = 50 pixel step per 0.1 second interval.
				break;
			case 'DEFAULT_ZOOMSPEED' :
				resTxt = '5'; // '1'=slow to '10'=fast, default is '5'.
				break;
			case 'DEFAULT_ZOOMSTEPDISTANCE' :
				resTxt = '0.02'; // 5 * 0.02 = .1 percent step default.
				break;
			case 'DEFAULT_ZAPSTEPDURATION' :
				resTxt = '30';  // Milliseconds.
				break;
			case 'DEFAULT_ZAPTVSTEPS' :
				resTxt = '20'; // 800 / 20 = 0.04 seconds per step default with variable distance per step.
				break;
			case 'DEFAULT_ZAPTVDURATION' :
				resTxt = '800'; // 800 / 20 = 0.04 seconds per step default with variable distance per step.
				break;
			case 'DEFAULT_CLICKZOOMTIERSKIPTHRESHOLD' :
				resTxt = '0.2';  // % of zoom delta from exact next tier.
				break;
			case 'DEFAULT_GESTURETESTDURATION' :
				resTxt = '10';  // Milliseconds.
				break;
			case 'DEFAULT_PINCHTESTDURATION' :
				resTxt = '10';  // Milliseconds.
				break;

			case 'DEFAULT_AUTORESIZESKIPDURATION' :
				resTxt = '10'; // Milliseconds.
				break;

			case 'DEFAULT_MOUSEWHEEL' :
				resTxt = '1';  // '0'=disabled, '1'=zoom priority (default), '2'=image set priority.
				break;
			case 'DEFAULT_MOUSEWHEELANIMATION' :
				resTxt = '1';  // '0'=disabled, '1'=zoom priority (default), '2'=image set priority.
				break;
			case 'DEFAULT_MOUSEWHEELSLIDESTACK' :
				resTxt = '1';  // '0'=disabled, '1'=zoom priority (default), '2'=image set priority.
				break;
			case 'DEFAULT_MOUSEWHEELCOMPLETEDURATION' :
				resTxt = '300'; // Milliseconds.
				break;
			case 'DEFAULT_FADEINSPEED' :
				resTxt = '5'; // '1'=slow to '10'=fast, default is '5'.
				break;
			case 'DEFAULT_FADEINSTEP' :
				resTxt = '0.067'; // 0.067 * default fade in speed of 5 = 0.335 x 3 steps to get over 1, at 50 milliseconds per step = 0.2 seconds to fade-in.
				break;

			case 'DEFAULT_KEYS' :
				resTxt = '1'; // '0'=disable, '1'=enable (default).
				break;
			case 'DEFAULT_MOUSEPAN' :
				resTxt = '1'; // '0'=disable, '1'=enable (default).
				break;
			case 'DEFAULT_CLICKPAN' :
				resTxt = '1'; // '0'=disable, '1'=enable (default).
				break;
			case 'DEFAULT_CLICKZOOM' :
				resTxt = '1'; // '0'=disable, '1'=enable (default).
				break;
			case 'DEFAULT_DOUBLECLICKZOOM' :
				resTxt = '1'; // '0'=disable, '1'=enable (default).
				break;
			case 'DEFAULT_DOUBLECLICKDELAY' :
				resTxt = '250'; // Milliseconds.
				break;
			case 'DEFAULT_CONSTRAINPAN' :
				resTxt = '1'; // '0'=disable, '1'=enable (default).
				break;
			case 'DEFAULT_CONSTRAINPANLIMIT' :
				resTxt = '2'; // '0'=false, '1'=loose (constrain image center to viewport edge), '2'=relaxed (default, constrain trailing edge to viewport center), '3'=strict (constrain trailing edge of image to far edge of display and center image when zoomed-out).
				break;
			case 'DEFAULT_CONSTRAINPANSTRICT' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
			case 'DEFAULT_SMOOTHPAN' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_SMOOTHPANEASING' :
				resTxt = '2'; // '1'=direct, '2'=fluid (default), '3'=gentle, '4'=relaxed, '5'=loose;
				break;
			case 'DEFAULT_SMOOTHPANGLIDE' :
				resTxt = '2'; // '1'=none, '2'=fluid (default), '3'=gentle, '4'=relaxed, '5'=loose;
				break;
			case 'DEFAULT_SMOOTHZOOM' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_SMOOTHZOOMEASING' :
				resTxt = '2'; // '1'=direct, '2'=fluid (default), '3'=gentle, '4'=relaxed;
				break;

			case 'DEFAULT_INITIALX' :
				resTxt = null;
				break;
			case 'DEFAULT_INITIALY' :
				resTxt = null;
				break;
			case 'DEFAULT_INITIALZOOM' :
				resTxt = null; // '0.01' to '0.5' recommended range, default is null (zoom-to-fit view area).
				break;
			case 'DEFAULT_MINZOOM' :
				resTxt = null; // '0.01' to '0.5' recommended range, default is null (zoom-to-fit view area).
				break;
			case 'DEFAULT_MAXZOOM' :
				resTxt = '1'; // '0.5' to '3' recommended range, default is '1' (100%).
				break;

			case 'DEFAULT_BACKGROUNDCOLOR' :
				resTxt = '#FBFAFA';
				break;
			case 'DEFAULT_BACKGROUNDCOLORNOALPHA' :
				resTxt = '#FBFAFA';
				break;
			case 'DEFAULT_BACKGROUNDCOLORLIGHT' :
				resTxt = '#FEFEFE';
				break;
			case 'DEFAULT_BACKGROUNDALPHA' :
				resTxt = '0.75';
				break;
			case 'DEFAULT_BACKGROUNDALPHAMORE' :
				resTxt = '0.9';
				break;
			case 'DEFAULT_BACKGROUNDSMALLDALPHA' :
				resTxt = '0.75';
				break;
			case 'DEFAULT_BUTTONBORDERCOLOR' :
				resTxt = '#C0C0C0';
				break;

			case 'DEFAULT_SKINXMLFILE' :
				resTxt = 'skinFiles.xml';
				break;
			case 'DEFAULT_SKINXMLPATH' :
				resTxt = 'Assets/Skins/Default';
				break;
			case 'DEFAULT_SKINMODE' :
				resTxt = '0'; // '0'=autoswitch if mobile device (default), '1'=always standard, '2'= always large.
				break;

			case 'DEFAULT_NAVIGATORVISIBLE' :
				resTxt = '2';  // '0'=hide, '1'=show, '2'=show/hide (default), '3'=hide/show.
				break;
			case 'DEFAULT_NAVIGATORWIDTH' :
				resTxt = '150'; // Pixels.
				break;
			case 'DEFAULT_NAVIGATORHEIGHT' :
				resTxt = '100'; // Pixels.
				break;
			case 'DEFAULT_NAVIGATORLEFT' :
				resTxt = '-1'; // Pixels from left viewport edge.
				break;
			case 'DEFAULT_NAVIGATORTOP' :
				resTxt = '-1'; // Pixels from top viewport edge.
				break;
			case 'DEFAULT_NAVIGATORFIT' :
				resTxt = null;
				break;
			case 'DEFAULT_NAVIGATORRECTANGLECOLOR' :
				resTxt = '#0000FF';
				break;
			case 'DEFAULT_NAVIGATORBORDERCOLOR' : // For Comparison viewing.
				resTxt = '#FFFFFF';
				break;

			case 'DEFAULT_TOOLBARVISIBLE' :
				resTxt = '4';  // '0'=hide, '1'=show, '2'=show/hide (default), '3'=hide/show, '4' & '5'=same as 2 and 3 but minimize rather than hiding. 8 hides toolbar and keeps it hidden (supports external toolbar with editing functions fully enabled). Note: minimize forced if setting is 2 or 3 and browser is on mobile device (no mouse-over).
				break;
			case 'DEFAULT_TOOLBARBACKGROUNDVISIBLE' :
				resTxt = '1';  // '0'=hide, '1'=show (default).
				break;
			case 'DEFAULT_TOOLBARBACKGROUNDVISIBLEADJUST' :
				resTxt = '10';  // Pixels
				break;
			case 'DEFAULT_TOOLBARHEIGHT' :
				resTxt = '30';
				break;				
			case 'DEFAULT_TOOLBARPOSITION' :
				resTxt = '1'; // '0'=top, '1'=bottom (default).
				break;
			case 'DEFAULT_TOOLTIPSVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;

			case 'DEFAULT_HELPVISIBLE' :
				resTxt = '1'; // '0'=hide, '1'=show (default), '2'=hide toolbar help, show annotation & markup help, '3'=reverse.
				break;

			case 'DEFAULT_LOGOVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_LOGOCUSTOMPATH' :
				resTxt = null;
				break;
			case 'DEFAULT_MINIMIZEVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_SLIDERZOOMVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_SLIDERTESTDURATIONZOOM' :
				resTxt = '10';  // Milliseconds.
				break;

			case 'DEFAULT_ZOOMBUTTONSVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;				
			case 'DEFAULT_PANBUTTONSVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_RESETVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;

			case 'DEFAULT_FULLVIEWVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_FULLSCREENVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_FULLVIEWBACKCOLOR' :
				resTxt = 'white';
				break;
			case 'DEFAULT_FULLPAGEVISIBLE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
			case 'DEFAULT_INITIALFULLPAGE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;

			case 'DEFAULT_BOOKMARKSGET' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
			case 'DEFAULT_BOOKMARKSSET' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;

			case 'DEFAULT_ZOOMRECTANGLE' :
				var comparison = (Z.comparison || (Z.imagePath !== null && Z.imagePath.indexOf('zComparisonPath') != -1)
					|| (typeof Z.parameters !== 'undefined' && Z.parameters !== null
					&& typeof Z.parameters.zComparisonPath !== 'undefined'
					&& (typeof Z.parameters.zZoomRectangle === 'undefined' || Z.parameters.zZoomRectangle != 0)));
				resTxt = (!Z.mobileDevice && !comparison && (Z.proParamsEnabled || Z.enterpriseParamsEnabled)) ? '1' : '0'; // '0'=false (default for mobile devices and Express edition), '1'=true (default for Pro and Enterprise editions).

				// DEV NOTE: Blocking zoom rectangle if in comparison mode to avoid update loop.
				//resTxt = (Z.proParamsEnabled || Z.enterpriseParamsEnabled) ? '1' : '0'; // '0'=false (default for Express edition), '1'=true (default for Pro and Enterprise editions).
				break;

			case 'DEFAULT_MEASUREVISIBLE' :
				// '0'=false (default), '1'=true.  False is default unless in markup or edit mode.
				if (typeof Z.parameters !== 'undefined' && Z.parameters !== null
					&& (typeof Z.parameters.zMeasureVisible === 'undefined' || Z.parameters.zMeasureVisible != '0')
					&& ((typeof Z.parameters.zMarkupMode !== 'undefined' && (Z.parameters.zMarkupMode == '1' || Z.parameters.zMarkupMode == '2'))
					|| (typeof Z.parameters.zEditMode !== 'undefined' && (Z.parameters.zEditMode == '1' || Z.parameters.zEditMode == '2')))) {
						resTxt = '1';
				} else {
					resTxt = '0';
				}
				break;

			case 'DEFAULT_FULLVIEWEXITEXTERNALBUTTONCOLOR' :
				resTxt = '	#F8F8F8'; // Very light gray.
				break;
				
			case 'DEFAULT_INITIALR' :
				resTxt = '0'; // Degrees
				break;
			case 'DEFAULT_ROTATIONVISIBLE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;

			case 'DEFAULT_PROGRESSVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;
			case 'DEFAULT_PROGRESSDURATION' :
				resTxt = '500';  // Milliseconds.
				break;
			case 'DEFAULT_PROGRESSTEXT' :
				resTxt = ' ';  // Blank.
				break;
			case 'DEFAULT_PROGRESSTEXTCOLOR' :
				resTxt = '#000000'; // Black.
				break;
			case 'DEFAULT_MESSAGESVISIBLE' :
				resTxt = '1'; // '0'=false, '1'=true (default).
				break;

			case 'DEFAULT_VIRTUALPOINTERVISIBLE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
			case 'DEFAULT_CROSSHAIRSVISIBLE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
			case 'DEFAULT_PRELOADVISIBLE' :
				resTxt = '0'; // '0'=false (default), '1'=true.
				break;
				
			case 'DEFAULT_TOOLBARLABELFONTSIZE' :
				resTxt = '11';
				break;

			case 'DEFAULT_MESSAGESCREENCOLOR' :
				resTxt = 'lightgray';
				break;
			case 'DEFAULT_MESSAGEBUTTONCOLOR' :
				resTxt = 'white';
				break;
			case 'DEFAULT_MESSAGEDURATIONLONG' :
				resTxt = '5000';
				break;
			case 'DEFAULT_MESSAGEDURATIONSTANDARD' :
				resTxt = '3000';
				break;
			case 'DEFAULT_MESSAGEDURATIONSHORT' :
				resTxt = '1500';
				break;
			case 'DEFAULT_MESSAGEDURATIONVERYSHORT' :
				resTxt = '750';
				break;

			case 'DEFAULT_TRACEDISPLAYTEXTFONTSIZE' :
				resTxt = '11';
				break;
			case 'DEFAULT_TRACEDISPLAYTEXTPADDINGSMALL' :
				resTxt = '2';
				break;
			case 'DEFAULT_TRACEDISPLAYSCREENCOLOR' :
				resTxt = '#D3D3D3';
				break;
			case 'DEFAULT_TRACEDISPLAYBUTTONCOLOR' :
				resTxt = '#FFFFFF';
				break;

			case 'DEFAULT_FOCAL' :
				resTxt = '1';
				break;
			case 'DEFAULT_QUALITY' :
				resTxt = '55';
				break;

			case 'DEFAULT_IMAGESETXMLFILE' :
				resTxt = (Z.animation) ? 'animation.xml' : (Z.overlay) ? 'overlays.xml' : 'slidestack.xml';
				break;

			case 'ALERT_VALIDATELOCALZIFVIEWING-TITLE' :
				resTxt = 'Local Viewing Security';
				break;	
			case 'ALERT_VALIDATELOCALZIFVIEWING-MESSAGE' :
				resTxt = 'Use button below to verify file to view:\n\n';
				break;
			case 'ALERT_ZIFREQUIRESNEWERBROWSER' :
				resTxt = 'Viewing Zoomify Images stored in the ZIF format requires a newer browser version. Please consider upgrading to the current release of your browser.';
				break;
			case 'ALERT_PFFREQUIRESNEWERBROWSER' :
				resTxt = 'Viewing Zoomify Images stored in the PFF format requires a newer browser version. Please consider upgrading to the current release of your browser.';
				break;

			case 'ALERT_HOWTOHELPREMINDER' :
				resTxt = '\nClick the \'?\' button for help.';
				break;

			case 'ERROR_ERROR' :
				resTxt = 'error';
				break;

			case 'ERROR_UNRECOGNIZEDPARAMETERALERT' :
				resTxt = 'Parameter unrecognized or deprecated - see the Parameters List documentation: ';
				break;
			case 'ERROR_PARAMETERDEPRECATED' :
				resTxt = 'Parameter deprecated - please replace: ';
				break;
				
			case 'ERROR_UNSUPPORTEDLOCALVIEWING-BROWSER' :
				resTxt = 'Use Firefox for local viewing or see READ ME FIRST\nfile for optional settings for other browsers.';
				break;
			case 'ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-ZIF' :
				resTxt = 'Browsers allow ZIF file viewing only from a web server.\nPlease use Zoomify Image folders for local viewing.';
				break;
			case 'ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-PFF' :
				resTxt = 'Browsers allow PFF file viewing only from a web server.\nPlease use Zoomify Image folders for local viewing.';
				break;
			case 'ERROR_IMAGEPATHINVALID' :
				resTxt = 'Image failed to load: possible invalid path, missing image, or network error.';
				break;
			case 'ERROR_TILEPATHINVALID' :
				resTxt = 'Sorry!  Part of this view is not refreshing.  The network may be slow, or the website may be missing a file:  ';
				break;

			case 'ERROR_VALIDATEVIEW' :
				resTxt = 'Sorry!  Part of this view is not refreshing. The network\nmay be slow, or the website may be missing a file.  ';
				break;
			case 'ERROR_TILEPATHINVALID-ZIF' :
				resTxt = 'Sorry!  Part of this view is not refreshing.  The network may be slow, or the ZIF file may be faulty:  ';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-ZIFBYTERANGE' :
				resTxt = 'Error loading image: ZIF file data request failed. Request content type: ';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-ZIFBYTES' :
				resTxt = 'Error loading image: ZIF file invalid.';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-PFFBYTES' :
				resTxt = 'Error loading image: PFF file invalid.';
				break;
			case 'ERROR_XMLHTTPREQUESTUNSUPPORTED' :
				resTxt = 'Browser does not support XMLHttpRequest.';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-IMAGEXML' :
				resTxt = 'Error loading image: please make sure image path in web page matches image folder location on webserver.';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-PFFIMAGEHEADER' :
				resTxt = 'Error loading image: image header request invalid.';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-PFFIMAGEOFFSET' :
				resTxt = 'Error loading image: image offset request invalid.';
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-PARAMETERSXML' :
				resTxt = "Error loading parameters XML: please make sure the zXMLParametersPath value is correct.";
				break;
			case 'ERROR_MAKINGNETWORKREQUEST-TOOLBARSKINSXML' :
				resTxt = "Error loading toolbar - skin files not found: please verify that the folders 'Assets/Skins/Default' are in same folder as the web page displaying the Viewer, or add zSkinPath parameter to web page. The zSkinPath parameter may be required if using a content management system such as Drupal, Joomla, or WordPress."; // Quotes reversed to display quoted single quotes.
				break;
			case 'ERROR_MAKINGNETWORKREQUEST' :
				resTxt = 'Error making network request:\npossible invalid path or network error.';
				break;
			case 'ERROR_NETWORKSECURITY' :
				resTxt = 'Error related to network security: ';
				break;
			case 'ERROR_NETWORKSTATUS' :
				resTxt = 'Error related to network status: ';
				break;
			case 'ERROR_NETWORKSTATUSRANGEREQUESTSZIF' :
				resTxt = 'ZIF file not found at the path provided. A MIME type may be needed on the web server. Please see the READ ME FIRST file in the Zoomify product or contact Support. Error: ';
				break;
			case 'ERROR_NETWORKSTATUSRANGEREQUESTSPFF' :
				resTxt = 'PFF file not found at the path provided. A MIME type may be needed on the web server. Please see the READ ME FIRST file in the Zoomify product or contact Support. Error: ';
				break;
			case 'ERROR_CONVERTINGXMLTEXTTODOC' :
				resTxt = ' converting XML text to XML doc (DOMParser): ';
				break;
			case 'ERROR_CONVERTINGXMLDOCTOTEXT' :
				resTxt = ' converting XML doc to XML text (DOMParser): ';
				break;
			case 'ERROR_XMLDOMUNSUPPORTED' :
				resTxt = 'Browser does not support XML DOM.';
				break;
			case 'ERROR_XMLDOCINVALID' :
				resTxt = 'XML Doc invalid.';
				break;
			case 'ERROR_XMLINVALID' :
				resTxt = 'XML invalid.';
				break;
			case 'ERROR_IMAGEXMLINVALID' :
				resTxt = 'Image XML invalid.';
				break;
			case 'ERROR_IMAGEPROPERTIESXMLINVALID' :
				resTxt = 'Image properties XML invalid.';
				break;
			case 'ERROR_IMAGEPROPERTIESINVALID' :
				resTxt = 'Image properties invalid.';
				break;
			case 'ERROR_IMAGEPROPERTIESPARAMETERINVALID' :
				resTxt = 'Image properties parameter invalid.';
				break;
			case 'ERROR_IMAGETILECOUNTINVALID' :
				resTxt = 'Image tile count does not match value in image XML. If the count is invalid display problems can result.';
				break;
			case 'ERROR_EXECUTINGCALLBACK' :
				resTxt = ' while executing callback: ';
				break;
			case 'ERROR_IMAGEREQUESTTIMEDOUT' :
				resTxt = '\nImage tile request not fulfilled within time period expected';
				break;

			case 'ERROR_UNCONVERTEDIMAGEPATHINVALID' :
				resTxt = 'Unconverted JPEG or PNG image failed to load: possible invalid path, missing image, or network error.';
				break;
			case 'ERROR_TRANSLATINGCANVASFORUNCONVERTEDIMAGE' :
				resTxt = '\nTranslation of canvas failed';
				break;
			case 'ERROR_SCALINGCANVASFORUNCONVERTEDIMAGE' :
				resTxt = '\nScaling of canvas failed';
				break;
			case 'ERROR_SETTINGTRANSFORMONCANVASFORUNCONVERTEDIMAGE' :
				resTxt = '\nTransform on canvas failed';
				break;

			case 'ERROR_NAVIGATORIMAGEPATHINVALID' :
				resTxt = 'Navigator image failed to load: possible invalid path, missing image, or network error.';
				break;
			case 'ERROR_SKINXMLINVALID' :
				resTxt = 'Skin XML invalid.';
				break;
			case 'ERROR_SKINXMLMISSINGNAMES' :
				resTxt = 'The skin XML file has one or more faulty name lines.';
				break;

			case 'ERROR_UNKNOWNELEMENTSTYLE' :
				resTxt = 'Unknown element style - no known method to identify.';
				break;
			case 'ERROR_UNKNOWNMOUSEPOSITION' :
				resTxt = 'Unknown mouse position - no known method to calculate.';
				break;
			case 'ERROR_UNKNOWNMOUSESCROLL' :
				resTxt = 'Unknown mouse scroll - no known method to calculate.';
				break;
			case 'ERROR_UNKNOWNWINDOWSIZE' :
				resTxt = 'Unknown window size - no known method to calculate.';
				break;

			case 'TIP_LOGOZOOMIFY' :
				resTxt = 'Open Zoomify Website';
				break;
			case 'TIP_LOGOGENERIC' :
				resTxt = 'Launch Website';
				break;

			case 'TIP_MINIMIZE' :
				var toggleText = (Z.hotspots) ? '\nAlt-Click: Toggle Hotspot Visibility' : (Z.annotations) ? '\nAlt-Click: Toggle Label Visibility' : '';
				resTxt = 'Minimize Toolbar' + toggleText;
				break;
			case 'TIP_EXPAND' :
				var toggleText = (Z.hotspots) ? '\nAlt-Click: Toggle Hotspot Visibility' : (Z.annotations) ? '\nAlt-Click: Toggle Label Visibility' : '';
				resTxt = 'Expand Toolbar' + toggleText;
				break;
			case 'TIP_ZOOMOUT' :
				resTxt = 'Zoom Out';
				break;
			case 'TIP_SLIDERZOOM' :
				resTxt = 'Zoom In And Out';
				break;
			case 'TIP_ZOOMIN' :
				resTxt = 'Zoom In';
				break;
			case 'TIP_PANLEFT' :
				resTxt = 'Pan Left';
				break;
			case 'TIP_PANUP' :
				resTxt = 'Pan Up';
				break;
			case 'TIP_PANDOWN' :
				resTxt = 'Pan Down';
				break;
			case 'TIP_PANRIGHT' :
				resTxt = 'Pan Right';
				break;
			case 'TIP_RESET' :
				resTxt = 'Reset Initial View\nAlt-Click: Prior View';
				break;

			case 'TIP_TOGGLEFULLVIEW' :
				resTxt = 'Enter Full View';
				break;
			case 'TIP_TOGGLEFULLVIEWEXIT' :
				resTxt = 'Exit Full View';
				break;
			case 'TIP_TOGGLEFULLVIEWEXITEXTERNAL' :
				resTxt = 'Exit Full View';
				break;

			case 'TIP_HELP' :
				resTxt = 'Show Help';
				break;
			case 'TIP_HELPMARKUP' :
				resTxt = 'Show Markup Help';
				break;
			case 'TIP_HELPANNOTATION' :
				resTxt = 'Show Annotation Help';
				break;

			case 'TIP_IMAGESETPRIOR' :
				resTxt = (Z.animation) ? 'Prior Image' : 'Prior Slide';
				break;
			case 'TIP_SLIDERIMAGESET' :
				resTxt = (Z.animation) ? 'Change Image' : 'Change Slide';
				break;
			case 'TIP_IMAGESETNEXT' :
				resTxt = (Z.animation) ? 'Next Image' : 'Next Slide';
				break;

			case 'TIP_PRELOAD' :
				resTxt = (!Z.imageSet) ? 'Preload All Zoom Levels For Current View' : (Z.animation) ? 'Preload Current View For All Images' : 'Preload Current View For All Slides';
				break;

			case 'TIP_HELPOK' :
				resTxt = 'Close Help Display';
				break;

			case 'TIP_MESSAGEOK' :
				resTxt = 'Accept And Close Message';
				break;
			case 'TIP_MESSAGECANCEL' :
				resTxt = 'Decline And Close Message';
				break;

			case 'UI_LOGOLINKZOOMIFY' :
				resTxt = 'http://www.zoomify.com';
				break;
			case 'UI_LOGOLINK' :
				resTxt = 'http://www.zoomify.com';
				break;
			case 'UI_LOGOLINKTARGET' :
				resTxt = '_blank';
				break;

			case 'UI_TOOLBARINTERNALBACKGROUNDALPHA' :
				resTxt = '0.75';
				break;
			case 'UI_TOOLBARINTERNALBACKGROUNDCOLOR' :
				resTxt = 'lightgray';
				break;
			case 'UI_TOOLBARINTERNALBUTTONUPCOLOR' :
				resTxt = 'white';
				break;
			case 'UI_TOOLBARINTERNALBUTTONOVERCOLOR' :
				resTxt = 'lightgray';
				break;
			case 'UI_TOOLBARINTERNALBUTTONDOWNCOLOR' :
				resTxt = 'darkgray';
				break;
			case 'UI_TOOLBARINTERNALBUTTONZOOMINTEXT' :
				resTxt = '+';
				break;
			case 'UI_TOOLBARINTERNALBUTTONRESETTEXT' :
				resTxt = 'Z'
				break;
			case 'UI_TOOLBARINTERNALBUTTONZOOMOUTTEXT' :
				resTxt = '-';
				break;

			case 'UI_NAVIGATORACCESSIBILITYALTATTRIBUTE' :
				resTxt = "Navigator Bird's Eye View"; // Quotes reversed to support possessive use.
				break;
			case 'UI_FVCANCELBUTTONTEXT' :
				resTxt = 'X';
				break;

			case 'UI_HELPDISPLAYWIDTH' :
				resTxt = '430';
				break;
			case 'UI_HELPDISPLAYHEIGHT' :
				resTxt = '300';
				break;
			case 'UI_HELPOKBUTTONTEXT' :
				resTxt = 'OK';
				break;
			case 'UI_HELPSCREENCOLOR' :
				resTxt = 'lightgray';
				break;
			case 'UI_HELPBUTTONCOLOR' :
				resTxt = 'white';
				break;

			case 'UI_MESSAGEDISPLAYWIDTH' :
				resTxt = '430';
				break;
			case 'UI_MESSAGEDISPLAYHEIGHT' :
				resTxt = '90';
				break;
			case 'UI_MESSAGECANCELBUTTONTEXT' :
				resTxt = 'Cancel';
				break;
			case 'UI_MESSAGEOKBUTTONTEXT' :
				resTxt = 'OK';
				break;		

			case 'UI_TRACEDISPLAYTITLE' :
				resTxt = "Trace Values\n\n";
				break;
			case 'UI_TRACEDISPLAYDEBUGINFOTEXT' :
				resTxt = "This panel is enabled using the HTML parameter 'zDebug=1' (basic) or 'zDebug=2' (adds tile tracing). " +
				"It can be called in JavaScript as follows:\n\n   Z.Utils.trace('value to display');  \n\nThe " +
				"buttons below display or modify important state values.  Web designers " +
				"new to JavaScript will also benefit from the console, trace, profiling, and " +
				"other debugging features of leading browsers."; // Quotes reversed to display quoted single quotes.
				break;
			case 'UI_TRACEDISPLAYTILESTATUSTEXT' :
				resTxt = 'Required Cached Requested Loaded Displayed Waiting';
				break;
			case 'UI_TRACEDISPLAYELAPSEDTIMETEXT' :
				resTxt = 'Seconds';
				break;
			case 'UI_TRACEDISPLAYTILESPERSECONDTEXT' :
				resTxt = 'Loads / Second';
				break;
			case 'UI_TRACEDISPLAYSHOWGLOBALSBUTTONTEXT' :
				resTxt = 'Show Globals';
				break;
			case 'UI_TRACEDISPLAYTOGGLEDISPLAYBUTTONTEXT' :
				resTxt = 'Toggle Display';
				break;
			case 'UI_TRACEDISPLAYTOGGLEBACKFILLBUTTONTEXT' :
				resTxt = 'Toggle Backfill';
				break;
			case 'UI_TRACEDISPLAYTOGGLECONSTRAINPANBUTTONTEXT' :
				resTxt = 'Toggle Constrain Pan';
				break;

			case 'CONTENT_HELPTOOLBAR' :
				resTxt = '<p align=%22center%22><font face=%22Arial,Helvetica,sans-serif%22><strong>Viewer Help</strong></font></p>'
				+ '<p align=%22justify%22><font face=%22Arial,Helvetica,sans-serif%22>To explore this image, simply <strong>click</strong> the image to zoom in, <strong>double-click</strong> to zoom out, and <strong>click-drag</strong> to pan.'
				+ '<br><br>Shortcuts:<br>&nbsp;&nbsp;&nbsp;<strong>Alt-click-drag</strong> to create a <i>zoom-rectangle</i>.<br>&nbsp;&nbsp;&nbsp;<strong>Alt-click</strong> to zoom fully in.<br>&nbsp;&nbsp;&nbsp;<strong>Alt-double-click</strong> to zoom fully out.<br>&nbsp;&nbsp;&nbsp;<strong>Alt-click-Reset</strong> button to return to the prior view.<br>&nbsp;&nbsp;&nbsp;(Alt is Option on Macintosh).'
				+ '<br><br>The Navigator thumbnail overview can also be clicked or click-dragged to pan.'
				+ '<br><br>Use the Toolbar for exact navigation - if using a mouse, hold it over any button to see a helpful tip.'
				+ '<br><br>Keyboard shortcuts:'
				+ '<br>&nbsp;&nbsp;&nbsp;<strong>A</strong> or <strong>Shift</strong> to zoom in.'
				+ '<br>&nbsp;&nbsp;&nbsp;<strong>Z</strong> or <strong>Ctrl</strong> to zoom out.'
				+ '<br>&nbsp;&nbsp;&nbsp;<strong>Arrows</strong> change image in slideshow/animation.'
				+ '<br>&nbsp;&nbsp;&nbsp;<strong>Space Bar</strong> to toggle fullscreen view.'
				+ '<br>&nbsp;&nbsp;&nbsp;<strong>Escape</strong> to reset initial view or exits fullscreen.'
				+ '<br>&nbsp;&nbsp;&nbsp;<strong>Alt-L</strong> to hide/show hotspots or labels.'
				+ '<br>&nbsp;&nbsp;&nbsp;<strong>Alt-click-Minimize</strong> button - same as Alt-L.'
				+ '<br>&nbsp;&nbsp;&nbsp;<strong>Page Up/Down</strong> change image in a slidestack.'
				+ '<br>&nbsp;&nbsp;&nbsp;<strong>&lt;</strong> or <strong>&gt;</strong> to rotate image if rotation buttons visible.'
				+ '</font></p>';
				break;
			case 'CONTENT_HELPCONCATENATOR' :
				resTxt = '<p align=%22center%22><font face=%22Arial,Helvetica,sans-serif%22><strong>\\/ \\/ \\/</strong></font></p>'
				break;
			case 'CONTENT_HELPANNOTATIONVIEWING' :
				resTxt = '<p align=%22center%22><font face=%22Arial,Helvetica,sans-serif%22><strong>Annotation Help</strong></font></p>'
				+ '<p align=%22justify%22><font face=%22Arial,Helvetica,sans-serif%22>The Annotation Panel provides an intuitive display of <i>Points of Interest</i> in a zoomable image, along with associated <i>Labels</i> and <i>Notes</i>, if any.'
				+ '<br><br>A Point Of Interest (POI) is a place in the image that is named and listed so that it can be navigated to easily.'
				+ '<br><br>A Label is a visual element in the image: a freehand drawing, text caption, rectangle or other polygon, or a measurement.'
				+ '<br><br>A Note is text associated with a Point Of Interest. Notes can hold a virtually unlimited number of characters (spaces included). A vertical scrollbar automatically appears when a note requires more lines than fit in the note area.'
				+ '</font></p>';
				break;

			case 'CONTENT_RULERUNITSCHOICELISTTITLE' :
				resTxt = 'Units...';
				break;				
			case 'CONTENT_RULERUNITSCHOICELISTVALUES' :
				resTxt = 'Pixels,Ym,Zm,Em,Pm,Tm,Gm,Mm,km,hm,dam,m,dm,cm,mm,um,nm,pm,fm,am,zm,ym';
				break;	

			case 'CONTENT_RULERLISTTYPELISTTITLE' :
				resTxt = 'List Type...';
				break;
			case 'CONTENT_RULERLISTTYPELISTVALUES' :				
				resTxt = 'None,Magnification,Percentage';
				break;
			case 'CONTENT_RULERSOURCEMAGNIFICATIONLISTTITLE' :
				resTxt = 'Source Magnification...';
				break;
			case 'CONTENT_RULERSOURCEMAGNIFICATIONLISTTEXT' :
				resTxt = '1.25x,2.5x,5x,10x,20x,40x,60x,100x';	
				break;
			case 'CONTENT_RULERSOURCEMAGNIFICATIONLISTVALUES' :
				resTxt = '1.25,2.5,5,10,20,40,60,100';	
				break;

			case 'CONTENT_HOTSPOTNAME' :
				resTxt = 'New Hotspot ';
				break;
			case 'CONTENT_HOTSPOTCAPTION' :
				resTxt = 'Caption for hotspot ';
				break;
			case 'CONTENT_LABELNAME' :
				resTxt = 'New Label ';
				break;
			case 'CONTENT_LABELCAPTION' :
				resTxt = 'Caption for label ';
				break;
			case 'CONTENT_LABELCOMMENT' :
				resTxt = 'Comment for label ';
				break;
			case 'CONTENT_POLYGONCAPTION' :
				resTxt = 'Polygon ';
				break;
			case 'CONTENT_LABELTOOLTIP' :
				resTxt = 'Tooltip for label ';
				break;
			case 'CONTENT_LABELCLICKURL' :
				resTxt = '';
				break;

			case 'CONTENT_CAPTIONTEXTCOLOR' :
				resTxt = (Z.captionTextColor) ? Z.captionTextColor : '#FFFFFF';
				break;
			case 'CONTENT_CAPTIONBACKCOLOR' :
				resTxt = (Z.captionBackColor) ? Z.captionBackColor : '#000000';
				break;
			case 'CONTENT_LABELLINECOLOR' :
				resTxt = (Z.labelLineColor) ? Z.labelLineColor : '#FFFFFF';
				break;
			case 'CONTENT_LABELFILLCOLOR' :
				resTxt = (Z.labelFillColor) ? Z.labelFillColor : '#FFFFFF';
				break;
			case 'CONTENT_CAPTIONTEXTVISIBLE' :
				resTxt = (Z.captionTextVisible) ? '1' : '0';
				break;
			case 'CONTENT_CAPTIONBACKVISIBLE' :
				resTxt = (Z.captionBackVisible) ? '1' : '0';
				break;
			case 'CONTENT_LABELLINEVISIBLE' :
				resTxt = (Z.labelLineVisible) ? '1' : '0';
				break;
			case 'CONTENT_LABELFILLVISIBLE' :
				resTxt = (Z.labelFillVisible) ? '1' : '0';
				break;
				
			case 'CONTENT_CAPTIONPOSITION' :
				resTxt = (Z.captionPosition) ? Z.captionPosition : '8';
				break;
				
			case 'CONTENT_EDITABLE' :
				resTxt = '1';
				break;
				
			case 'CONTENT_LINESTYLE' :
				resTxt = 'solid';
				break;	

			default:
				resTxt = 'Unexpected resource request';
		}
		return resTxt;
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::: ELEMENT & OBJECT UTILITY FUNCTIONS ::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	
	clearDisplay : function (display, targetViewer) {
		// Completely clear viewport or other display including prior tiles better than backfill. Subsequent
		// redraw of new tiles will leave gaps with backfill showing rather than tiles from prior view.
		if (display) {
			if (typeof targetViewer === 'undefined' || targetViewer === null) { targetViewer = Z['Viewer']; }
			if (Z.useCanvas && display.tagName == 'CANVAS') {
				Z.Utils.clearCanvas(display, targetViewer);
			} else {
				while (display.hasChildNodes()) {
				 	display.removeChild(display.lastChild);
				}
			}
		}
	},

	clearCanvas : function (canvas, targetViewer) {
		if (typeof targetViewer === 'undefined' || targetViewer === null) { targetViewer = Z['Viewer']; }
		var ctx = canvas.getContext('2d');
		ctx.save();
		// Trap possible NS_ERROR_FAILURE error especially in firefox especially if working with large unconverted image.
		// DEV NOTE: Add retry or soft fail in catch in future implementation for firefox issue with large canvases.
		try {
			ctx.setTransform(1,0,0,1,0,0);
		} catch (e) {
			targetViewer.showMessage(Z.Utils.getResource('ERROR_SETTINGTRANSFORMONCANVASFORUNCONVERTEDIMAGE'));
			console.log('In function clearCanvas setting transform on canvas:  ' + e);
		}
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
	},

	colorCanvas : function (canvas, color) {
		var ctx = canvas.getContext('2d');
		ctx.save();
		ctx.setTransform(1,0,0,1,0,0);
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
	},

	deleteDiv : function (zvIntID, divID) {
		var targetDiv = Z.Utils.getElementOfViewerById(zvIntID, divID);
		if (targetDiv) {
			while (targetDiv.hasChildNodes()) {
				targetDiv.removeChild(targetDiv.lastChild);
			}
			targetDiv.parentNode.removeChild(targetDiv);
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

	getContainerSize : function (container, display) {
		var containerS = Z.Utils.getElementStyle(container);
		var containerW = parseFloat(containerS.width);
		var containerH = parseFloat(containerS.height);

		if (Z.Utils.stringValidate(containerS.width) && containerS.width.indexOf('%') != -1) { containerW = parseFloat(Z.Utils.getElementStyleProperty(container, 'width')); } // Win IE only.
		if (Z.Utils.stringValidate(containerS.height) && containerS.height.indexOf('%') != -1) { containerH = parseFloat(Z.Utils.getElementStyleProperty(container, 'height')); } // Win IE only.
		if (isNaN(containerW)) { containerW = display.clientWidth; }
		if (isNaN(containerH)) { containerH = display.clientHeight; }
		if (containerW == 0 || containerH == 0) {
			winDimensions = Z.Utils.getWindowSize();
			if (containerW == 0) {
				container.parentNode.style.width = winDimensions.x + 'px';
				containerW = container.clientWidth;
			}
			if (containerH == 0) {
				container.parentNode.style.height = winDimensions.y + 'px';
				containerH = container.clientHeight;
			}
		}

		// Fail-safe defaults.
		if (isNaN(containerW) || containerW == 0) { containerW = 800; }
		if (isNaN(containerH) || containerH == 0) { containerH = 400; }

		return new Z.Utils.Point(containerW, containerH);
	},

	createContainerElement : function (vwrIntID, tagName, id, display, position, overflow, width, height, left, top, borderStyle, borderWidth, background, margin, padding, whiteSpace, cursor, preventSelect, borderColor) {
		var emptyContainer = document.createElement(tagName);
		if (this.stringValidate(id)) { emptyContainer.id = id + vwrIntID; }
		var ecS = emptyContainer.style;
		ecS.display = (this.stringValidate(display)) ? display : 'inline-block';
 		ecS.position = (this.stringValidate(position)) ? position : 'static';
 		ecS.overflow = (this.stringValidate(overflow)) ? overflow : 'hidden';
 		if (tagName == 'canvas') {
 			if (this.stringValidate(width)) { emptyContainer.setAttribute('width', width); }
 			if (this.stringValidate(height)) { emptyContainer.setAttribute('height', height); }
 		} else {
 			if (this.stringValidate(width)) { ecS.width = width; }
 			if (this.stringValidate(height)) { ecS.height = height; }
 		}
 		if (this.stringValidate(left)) { ecS.left = left; }
 		if (this.stringValidate(top)) { ecS.top = top; }
 		ecS.borderStyle = (this.stringValidate(borderStyle)) ? borderStyle : 'none';
 		ecS.borderWidth = (this.stringValidate(borderWidth)) ? borderWidth : '0px'; 		
 		ecS.borderColor = (this.stringValidate(borderColor)) ? borderColor : '#696969';
 		ecS.background = (this.stringValidate(background)) ? background : 'transparent none';
 		ecS.margin = (this.stringValidate(margin)) ? margin : '0px';
 		ecS.padding = (this.stringValidate(padding)) ? padding : '0px';
 		ecS.whiteSpace = (this.stringValidate(whiteSpace)) ? whiteSpace : 'normal';
 		if (this.stringValidate(cursor)) { ecS.cursor = cursor; } // No explicit default assignment.
		if (preventSelect !== 'undefined' && preventSelect) {
			Z.Utils.addEventListener(emptyContainer, 'touchstart', Z.Utils.preventDefault);
			Z.Utils.addEventListener(emptyContainer, 'mousedown', Z.Utils.preventDefault);
			Z.Utils.addEventListener(emptyContainer, 'contextmenu', Z.Utils.preventDefault);
		}
		return emptyContainer;
	},

	createCenteredElement : function (vwrIntID, elmt, id) {
		// Note that id is assigned to inner centered container not to embedded text node. To access use
		// firstChild, for example: var textNode = Z.Utils.getElementOfViewerById(zvIntID, 'myTextNode').firstChild;
		var div = this.createContainerElement(vwrIntID, 'div');
		var html = [];
		html[html.length] = '<div style="#position:relative; display:table; height:100%; width:100%; border:none; margin:0px; padding:0px; overflow:hidden; text-align:left;">';
		html[html.length] = '<div style="#position:absolute; display:table-cell; #top:50%; width:100%; border:none; margin:0px; padding:0px; vertical-align:middle;">';
		html[html.length] = '<div id="' + id + '"; style="#position:relative; width:100%; #top:-50%; border:none; margin:0px; padding:0px; text-align:center;"></div></div></div>';

		// Debug option: console.log(html.toString());
		div.innerHTML = html.join('');
		div = div.firstChild;
		var innerDiv = div;
		var innerDivs = div.getElementsByTagName('div');
		while (innerDivs.length > 0) {
			innerDiv = innerDivs[0];
			innerDivs = innerDiv.getElementsByTagName('div');
		}
		innerDiv.appendChild(elmt);
		return div;
	},

	createTextElement : function (vwrIntID, id, value, width, height, left, top, padding, border, borderWidth, readOnly, fontFamily, fontSize, resize, columns, rows, overflowX, overflowY, wrap) {
		var textBox = Z.Utils.createContainerElement(vwrIntID, 'div', 'textBoxFor-' + id, 'inline-block', 'absolute', 'hidden', width, height, left, top, border, borderWidth, 'white', '0px', padding, 'normal');
		var textArea = document.createElement('textarea');
		textBox.appendChild(textArea);
		var ntA = textArea;
		var ntaS = ntA.style;
		ntA.id = id + vwrIntID;
		ntA.value = value;
		ntA.readOnly = readOnly;
		ntaS.width = '100%';
		ntaS.height = '100%';
		ntaS.margin = '0';
		ntaS.border = '0';
		if (this.stringValidate(fontFamily)) { ntaS.fontFamily = fontFamily; }
		if (this.stringValidate(fontSize)) { ntaS.fontSize = fontSize; }
		if (this.stringValidate(resize)) { ntaS.resize = resize; }
		if (this.stringValidate(columns)) { ntA.columns = columns; }

		// Support single-line, non-wrapping, no scrollbar textarea (use createTextNode for labels).
		if (this.stringValidate(rows)) { ntA.rows = rows; }
		if (this.stringValidate(overflowX)) { ntaS.overflowX = overflowX; }
		if (this.stringValidate(overflowY)) { ntaS.overflowY = overflowY; }
		if (this.stringValidate(wrap)) {
			ntA.wrap = wrap;
			// DEV NOTE: Alternative implementation - may require overlow='auto' and/or whiteSpace='pre'.
			if (wrap == 'off') { ntaS.whiteSpace = 'nowrap'; }
		}

		return textBox;
	},

	createSelectElement : function (vwrIntID, listID, listTitle, dataProvider, listW, listX, listY, fontSize, visible, handler, handlerType) {
		// Create list.
		var sList = document.createElement('select');
		sList.id = listID + vwrIntID;
		if (Z.Utils.stringValidate(listTitle) && listTitle != 'none') { sList.options[0] = new Option(listTitle, null); } // First option, set without value.
		for (var i = 0, j = dataProvider.length; i < j; i++) {
			sList.options[sList.options.length] = new Option(dataProvider[i].text, dataProvider[i].value);
		}

		// Assigning handler to mousedown event allows handler to set selected element to null and then assign change handler which
		// enables reselection of current element in list which would otherwise not trigger a change event. Alternative is to assign handler
		// to onchange event. Additional note: if no need to remove handler, direct assignment is possible as follows: sList.onchange = handler;
		var hType = (typeof handlerType !== 'undefined' && handlerType !== null) ? handlerType : 'change';
		Z.Utils.addEventListener(sList, hType, handler);

		// Set list position and visibilty.
		var slS = sList.style;
		slS.width = listW + 'px';
		slS.position = 'absolute';
		slS.left = listX + 'px';
		slS.top = listY + 'px';
		slS.fontSize = (fontSize == null) ? '11px' : fontSize + 'px';
		slS.fontFamily = 'verdana';
		slS.visibility = visible;

		return sList;
	},

	updateSelectElement : function (listObject, dataProvider, selID) {
		if (listObject) {
			var index = (listObject.selectedIndex != -1) ? listObject.selectedIndex : 0;
			listObject.innerHTML = '';
			for (var i = 0, j = dataProvider.length; i < j; i++) {
				listObject.options[listObject.options.length] = new Option(dataProvider[i].text, dataProvider[i].value.toString());
			}
			if (typeof selID !== 'undefined' && selID !== null) {
				var indexID = parseInt(Z.Utils.arrayIndexOfObjectValue(dataProvider, 'value', selID), 10);
				if (indexID != -1) { index = indexID; }
			}
			var indexLast = listObject.options.length - 1;
			listObject.selectedIndex = (index <= indexLast) ? index : indexLast;
		}
	},

	getChildElementByID : function (container, id) {
		var targetElmt = null;
		for (var i = 0, j = container.childNodes.length; i < j; i++) {
			var currNode = container.childNodes[i];
			if (currNode.id == id) {
				targetElmt = currNode;
				return targetElmt;
			} else {
				targetElmt = Z.Utils.getChildElementByID(currNode, id);
				if (targetElmt !== null) { return targetElmt; }
			}
		}
		return targetElmt;
	},
	
	getElementOfViewerById : function (vwrIntID, id) {
		return document.getElementById(id + vwrIntID);
	},

	getElementPosition : function (elmt) {
		var left = 0;
		var top = 0;
		var isFixed = this.getElementStyle(elmt).position == 'fixed';
		var offsetParent = this.getOffsetParent(elmt, isFixed);
		while (offsetParent) {
			left += elmt.offsetLeft;
			top += elmt.offsetTop;
			if (isFixed) {
				var psPt = this.getPageScroll();
				left += psPt.x;
				top += psPt.y;
			}
			elmt = offsetParent;
			isFixed = this.getElementStyle(elmt).position == 'fixed';
			offsetParent = this.getOffsetParent(elmt, isFixed);
		}
		return new this.Point(left, top);
	},

	getOffsetParent : function (elmt, isFixed) {
		if (isFixed && elmt != document.body) {
			return document.body;
		} else {
			return elmt.offsetParent;
		}
	},

	getElementSize : function (elmt) {
		return new this.Point(elmt.clientWidth, elmt.clientHeight);
	},

	getElementStyle : function (elmt) {
		if (elmt.currentStyle) {
			return elmt.currentStyle;
		} else if (window.getComputedStyle) {
			return window.getComputedStyle(elmt, '');
		} else {
			alert(this.getResource('ERROR_UNKNOWNELEMENTSTYLE'));
		}
	},

	getElementStyleProperty : function (elmt, styleProp) {
		if (window.getComputedStyle) {
			return window.getComputedStyle(elmt, null).getPropertyValue(styleProp);
		} else if (elmt.currentStyle) {
			return elmt.currentStyle[styleProp];
		} else {
			alert(this.getResource('ERROR_UNKNOWNELEMENTSTYLE'));
		}
	},

	getElementStylePropertyZIndex : function (elmt) {
		var zIndex = 0;
		if (window.document.defaultView.getComputedStyle) {
			zIndex = window.document.defaultView.getComputedStyle(elmt, null).getPropertyValue('z-index');
		} else if (elmt.currentStyle) {
			zIndex = elmt.currentStyle['z-index'];
		} else {
			alert(this.getResource('ERROR_UNKNOWNELEMENTSTYLE'));
		}
		return zIndex;
	},

	isElementFluid : function (element) {
		var valuesPixel = null;
		var clone = element.cloneNode(false);
		var testContainer, offsetW, offsetH, percent1, percent2;
		var wFluid = false, hFluid = false;
		var fluidNew = null, fluidFailSafe = null;
		var containerW = 0, containerH = 0;

		var containerS = Z.Utils.getElementStyle(element);
		if (containerS) {
			containerW = containerS.width;
			containerH = containerS.height;
			valuesPixel = (containerW.indexOf('px') != -1 && containerH.indexOf('px') != -1);
		}

		// Prevent auto resizing in old versions of IE due to lack of support for CSS tests in function isElementFluid.
		if (Z.browser != Z.browsers.IE || (Z.browserVersion >= 9 && !valuesPixel)) {

			// First test width.
			if (window.getComputedStyle) {
				value = window.getComputedStyle(clone,null).width;
			} else if (clone.currentStyle) {
				value = clone.currentStyle.width;
			}
			if (typeof value !== 'undefined' && value !== null && value !== '') {
				wFluid = (value.toString().indexOf('%') != -1 || value == 'auto'); // Test for 'auto' for IE.
			}

			// If width not fluid, test height.
			if (!wFluid) {
				if (window.getComputedStyle) {
					value = window.getComputedStyle(clone,null).height;
				} else if (clone.currentStyle) {
					value = clone.currentStyle.height;
				}
				if (typeof value !== 'undefined' && value !== null && value != '') {
					hFluid = (value.toString().indexOf('%') != -1 || value == 'auto'); // Test for 'auto' for IE.
				}
			}

			// If neither width nor height is fluid, test for vw or vh values.
			if (!wFluid && !hFluid) { fluidNew = Z.Utils.isElementFluidNew(element); }

			// Fail-safe: assume decimal pixel value computed and therefore fluid.
			if (!wFluid && !hFluid) { fluidFailSafe = (parseFloat(containerW) % 1 != 0 || parseFloat(containerH) % 1 != 0); }
		}

		return (wFluid || hFluid || fluidNew || fluidFailSafe);
	},

	// Workaround to determine if vw or vh is used rather than pixels or percents.
	// DEV NOTE: This workaround is not robust. Use zAutoResize=1 to force resizability if using vw and vh rather than percent values.
	isElementFluidNew : function (element) {
		// Debug: attempt to search for vw or vh value in container settings.
		//console.log(element.parentNode.parentNode.innerHTML);

		var clone = element.cloneNode(false);
		var testContainer, offsetW, offsetH, percent1, percent2;
		var wFluidNew = false, hFluidNew = false;

		// First test width.
		clone.style.margin = '0';
		clone.style.padding = '0';
		clone.style.maxWidth = 'none';
		clone.style.minWidth = 'none';
		testContainer = document.createElement('testContainer');
		testContainer.style.display = 'block';
		testContainer.style.width = '800px';
		testContainer.style.padding = '0';
		testContainer.style.margin = '0';
		testContainer.appendChild(clone);
		element.parentNode.insertBefore(testContainer, element);
		offsetW = clone.offsetWidth;
		testContainer.style.width = '900px';
		if ( clone.offsetWidth == offsetW ){
			element.parentNode.removeChild(testContainer);
			wFluidNew = false;
		} else {
			percent1 = Math.floor(100 / 800 * offsetW);
			percent2 = Math.floor(100 / 900 * clone.offsetWidth);
			element.parentNode.removeChild(testContainer);
			wFluidNew = (percent1 == percent2) ? true : false;
			// Debug option: console.log(Math.round(percent1) + '%');
		}

		// If width not fluid, test height.
		if (!wFluidNew) {
			clone.style.margin = '0';
			clone.style.padding = '0';
			clone.style.maxHeight = 'none';
			clone.style.minHeight = 'none';
			testContainer = document.createElement('testContainer');
			testContainer.style.display = 'block';
			testContainer.style.height = '800px';
			testContainer.style.padding = '0';
			testContainer.style.margin = '0';
			testContainer.appendChild(clone);
			element.parentNode.insertBefore(testContainer, element);
			offsetH = clone.offsetHeight;
			testContainer.style.height = '900px';
			if ( clone.offsetHeight == offsetH ){
				element.parentNode.removeChild(testContainer);
				hFluidNew = false;
			} else {
				percent1 = Math.floor(100 / 800 * offsetH);
				percent2 = Math.floor(100 / 900 * clone.offsetHeight);
				element.parentNode.removeChild(testContainer);
				hFluidNew = (percent1 == percent2) ? true : false;
				// Debug option: console.log(Math.round(percent1) + '%');
			}
		}

		return (wFluidNew || hFluidNew);
	},

	getEventTargetCoords : function (event) {
		return getElementPosition(Z.Utils.target(event));
	},

	getFirstTouch : function (event) {
		var firstTouch = null;
		var touches = event.touches;
		var changed = event.changedTouches;
		if (typeof touches !== 'undefined') {
			firstTouch = touches[0];
		} else if (typeof changed !== 'undefined') {
			firstTouch = changed[0];
		}
		return firstTouch;
	},

	getSecondTouch : function (event) {
		var secondTouch = null;
		var touches = event.touches;
		var changed = event.changedTouches;
		if (typeof touches !== 'undefined') {
			secondTouch = touches[1];
		} else if (typeof changed !== 'undefined') {
			secondTouch = changed[1];
		}
		return secondTouch;
	},

	getMousePosition : function (event) {
		var x = 0;
		var y = 0;
		if (event.type == 'DOMMouseScroll' && Z.browser == Z.browsers.FIREFOX && Z.browserVersion < 3) {
			x = event.screenX;
			y = event.screenY;
		} else if (typeof event.pageX === 'number') {
			x = event.pageX;
			y = event.pageY;
		} else if (typeof event.clientX === 'number') {
			x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		} else {
			// DEV NOTE: Error reported onSony Z3. Investigating.
			console.log(this.getResource('ERROR_UNKNOWNMOUSEPOSITION'));
		}
		return new this.Point(x, y);
	},

	getMouseScroll : function (event) {
		var delta = 0;
		if (typeof event.wheelDelta === 'number') {
			delta = event.wheelDelta;
		} else if (typeof event.detail === 'number') {
			delta = event.detail * -1;
		} else {
			alert(this.getResource('ERROR_UNKNOWNMOUSESCROLL'));
		}
		return delta ? delta / Math.abs(delta) : 0;
	},

	getPageScroll : function () {
		var x = 0;
		var y = 0;
		var docElmt = document.documentElement || {};
		var body = document.body || {};
		if (typeof window.pageXOffset === 'number') {
			x = window.pageXOffset;
			y = window.pageYOffset;
		} else if (body.scrollLeft || body.scrollTop) {
			x = body.scrollLeft;
			y = body.scrollTop;
		} else if (docElmt.scrollLeft || docElmt.scrollTop) {
			x = docElmt.scrollLeft;
			y = docElmt.scrollTop;
		}
		return new this.Point(x, y);
	},

	getScreenSize : function () {
		var x = screen.width;
		var y = screen.height;
		return new this.Point(x, y);
	},

	getWindowSize : function () {
		var x = 0;
		var y = 0;
		var docElmt = document.documentElement || {};
		var body = document.body || {};
		if (typeof window.innerWidth === 'number') {
			x = window.innerWidth;
			y = window.innerHeight;
		} else if (docElmt.clientWidth || docElmt.clientHeight) {
			x = docElmt.clientWidth;
			y = docElmt.clientHeight;
		} else if (body.clientWidth || body.clientHeight) {
			x = body.clientWidth;
			y = body.clientHeight;
		} else {
			alert(this.getResource('ERROR_UNKNOWNWINDOWSIZE'));
		}
		return new this.Point(x, y);
	},

	Button : function (vwrIntID, id, label, graphicPath, graphicUp, graphicOver, graphicDown, w, h, x, y, btnEvnt, btnEvntHndlr, tooltipResource, borderStyle, borderWidth, background, margin, padding, whiteSpace, cursor, tooltipsVisible) {
		if (typeof tooltipsVisible == 'undefined' || tooltipsVisible == null) { tooltipsVisible = (Z.Utils.getResource('DEFAULT_TOOLTIPSVISIBLE') != '0'); }
		var button = Z.Utils.createContainerElement(vwrIntID, 'span', id, 'inline-block', 'absolute', 'hidden', w, h, x, y, borderStyle, borderWidth, background, margin, padding, whiteSpace, cursor);
		if (!(Z.Utils.stringValidate(label))) {
			// Load images for each button state.
			graphicPath = Z.Utils.stringRemoveTrailingSlashCharacters(graphicPath);
			var imgUp = Z.Utils.createGraphicElement(vwrIntID, graphicPath + '/' + graphicUp);
			var imgOver = Z.Utils.createGraphicElement(vwrIntID, graphicPath + '/' + graphicOver);
			var imgDown = Z.Utils.createGraphicElement(vwrIntID, graphicPath + '/' + graphicDown);

			// Set size and position of button images.
			imgUp.style.width = imgOver.style.width = imgDown.style.width = w;
			imgUp.style.height = imgOver.style.height = imgDown.style.height = h;
			imgUp.style.position = imgOver.style.position = imgDown.style.position = 'absolute';
			if (Z.browser == Z.browsers.FIREFOX && Z.browserVersion < 3) { imgUp.style.top = imgOver.style.top = imgDown.style.top = ''; }

			// Set size and position of button images. Do not explicitly set 'up' graphic visible
			// because this leads to button showing even if in CSS layer that is initially hidden.
			imgOver.style.visibility = imgDown.style.visibility = 'hidden';

			// Set image alt attribute for accessibility compliance.
			imgUp.alt = imgOver.alt = imgDown.alt = '';
			if (typeof tooltipResource !== 'undefined' && Z.Utils.stringValidate(tooltipResource)) {
				imgUp.alt = Z.Utils.getResource(tooltipResource);
			}

			// Add images to button.
			button.appendChild(imgUp);
			button.appendChild(imgOver);
			button.appendChild(imgDown);

		} else {
			var textNode = document.createTextNode(label);
			button.appendChild(Z.Utils.createCenteredElement(vwrIntID, textNode));
			Z.Utils.setTextNodeStyle(textNode, 'black', 'verdana', '13px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none');
		}

		// Prevent graphic dragging, event bubbling, menu display, label text selection.
		Z.Utils.addEventListener(button, 'mousedown', Z.Utils.preventDefault);
		Z.Utils.addEventListener(button, 'mouseover', Z.Utils.stopPropagation);
		Z.Utils.addEventListener(button, 'mousedown', Z.Utils.stopPropagation);
		Z.Utils.addEventListener(button, 'mouseup', Z.Utils.stopPropagation);
		Z.Utils.addEventListener(button, 'mouseout', Z.Utils.stopPropagation);
		if (typeof imageUp !== 'undefined') {
			Z.Utils.addEventListener(imgUp, 'contextmenu', Z.Utils.preventDefault);
			Z.Utils.addEventListener(imgOver, 'contextmenu', Z.Utils.preventDefault);
			Z.Utils.addEventListener(imgDown, 'contextmenu', Z.Utils.preventDefault);
			//imgUp.oncontextmenu = Z.Utils.preventDefault; // DEV NOTE: Ineffective on IE.
		}
		Z.Utils.addEventListener(button, "touchstart", Z.Utils.preventDefault);
		Z.Utils.addEventListener(button, "touchend", Z.Utils.preventDefault);
		Z.Utils.addEventListener(button, "touchcancel", Z.Utils.preventDefault);
		if (!(Z.Utils.stringValidate(label))) {
			Z.Utils.disableTextInteraction(textNode);
			Z.Utils.addEventListener(button, 'contextmenu', Z.Utils.preventDefault);
		}

		// Set tooltip visibility per optional parameter.
		if (tooltipsVisible && Z.Utils.stringValidate(tooltipResource)) { button.title = Z.Utils.getResource(tooltipResource); }

		// Return button with event handler enabled.
		Z.Utils.setButtonHandler(button, btnEvnt, btnEvntHndlr);
		this.elmt = button;
	},

	buttonSize : function (targetBtn, w, h) {
		var btnS = targetBtn.style;
		btnS.width = w + 'px';
		btnS.height = h + 'px';
		var iU = targetBtn.firstChild;
		var iO = targetBtn.childNodes[1];
		var iD = targetBtn.childNodes[2];
		if (iU && iO && iD) {
			iU.style.width = iO.style.width = iD.style.width = w + 'px';
			iU.style.height = iO.style.height = iD.style.height = w + 'px';
		}
	},
	
	setButtonDefaults : function (targetBtn, thisToolbar) {
		if (typeof thisToolbar === 'undefined' || thisToolbar === null) { thisToolbar = Z['Toolbar']; }
		if (thisToolbar) {
			Z.Utils.clearButtonSettings(targetBtn);
			Z.Utils.setButtonState(targetBtn, 'up');
			Z.Utils.setButtonHandler(targetBtn, 'mouseover', thisToolbar.buttonEventsHandler);
		}
	},


	clearButtonSettings : function (targetBtn, thisToolbar) {
		if (typeof thisToolbar === 'undefined' || thisToolbar === null) { thisToolbar = Z['Toolbar']; }
		if (thisToolbar) {
			var iU = targetBtn.firstChild;
			var iO = targetBtn.childNodes[1];
			var iD = targetBtn.childNodes[2];
			if (iU && iO && iD) {
				iU.style.visibility = iO.style.visibility = iD.style.visibility = 'hidden';
				Z.Utils.removeEventListener(iU, 'mouseover', thisToolbar.buttonEventsHandler);
				Z.Utils.removeEventListener(iO, 'mousedown', thisToolbar.buttonEventsHandler);
				Z.Utils.removeEventListener(iO, 'mouseout', thisToolbar.buttonEventsHandler);
				Z.Utils.removeEventListener(iD, 'mouseup', thisToolbar.buttonEventsHandler);
				Z.Utils.removeEventListener(targetBtn, 'touchstart', thisToolbar.buttonEventsHandler);
				Z.Utils.removeEventListener(targetBtn, 'touchend', thisToolbar.buttonEventsHandler);
				Z.Utils.removeEventListener(targetBtn, 'touchcancel', thisToolbar.buttonEventsHandler);
			}
			Z.Utils.removeEventListener(targetBtn, 'mouseover', thisToolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(targetBtn, 'mousedown', thisToolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(targetBtn, 'mouseout', thisToolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(targetBtn, 'mouseup', thisToolbar.buttonEventsHandler);
		}
	},

	setButtonState : function (targetBtn, state) {
		var graphic = (state == 'up') ? targetBtn.firstChild : (state == 'down') ? targetBtn.childNodes[1] : targetBtn.childNodes[2];
		if (graphic) { graphic.style.visibility = 'visible'; }
	},

	setButtonHandler : function (target, btnEvnt, btnEvntHndlr) {
		// Allow for button with graphics or label, context as pc or mobile device, and event up, over, or down state relevant.
		var mouseEvent = (btnEvnt !== 'undefined') ? btnEvnt : 'mouseover';
		var touchEvent = (btnEvnt == 'mousedown') ? 'touchstart' : 'touchend';
		var pointerEvent = (btnEvnt == 'mousedown') ? 'MSPointerDown' : 'MSPointerUp';

		// MSPointer event support to follow.
		//targetEvent = (window.navigator.msPointerEnabled) ? pointerEvent : (Z.touchSupport) ? touchEvent : mouseEvent;

		// Support touch and mouse events and prevent touch events from simulating mouse events and creating duplicate function calls.
		//targetEvent = (Z.touchSupport) ? touchEvent : mouseEvent;

		var target = target;
		if (btnEvnt == 'mouseover' && typeof target.firstChild !== 'undefined') {
			target = target.firstChild;
		} else if (btnEvnt == 'mousedown' && typeof target.childNodes[1] !== 'undefined') {
			//target = target.childNodes[1];
		} else if (btnEvnt == 'mouseup' && typeof target.childNodes[2] !== 'undefined') {
			target = target.childNodes[2];
		} else if (btnEvnt == 'mouseout' && typeof target.childNodes[1] !== 'undefined') {
			target = target.childNodes[1];
		}

		// Support touch and mouse events and prevent touch events from simulating mouse events and creating duplicate function calls.
		var targetToolbar = Z['Toolbar'];
		var targetEventHandler = (btnEvntHndlr !== 'undefined') ? btnEvntHndlr : (targetToolbar) ? targetToolbar.buttonEventsHandler : null;
		if (targetEventHandler) { 
			Z.Utils.addEventListener(target, touchEvent, targetEventHandler);
			Z.Utils.addEventListener(target, mouseEvent, targetEventHandler);
		}
	},

	Checkbox : function (vwrIntID, id, value, w, h, x, y, checkEvnt, checkEvntHndlr, tooltipResource, tooltipsVisible) {
		// Container serves as workaround for checkbox and form sizing and positioning problems.
		var containerBox = Z.Utils.createContainerElement(vwrIntID, 'div', 'containerFor-' + id, 'inline-block', 'absolute', 'hidden', w, h, x, y, 'none', '0px', 'transparent none', '0px', '0px', 'normal');
		var checkbox = document.createElement('input');
		containerBox.appendChild(checkbox);
		checkbox.type = 'checkbox';
		checkbox.id = id + vwrIntID;
		checkbox.value = value;
		checkbox.width = w;
		checkbox.height = h;
		var cS = containerBox.style;
		cS.width = w + 'px';
		cS.height = h + 'px';
		cS.left = x + 'px';
		cS.top = y + 'px';

		// Set event handler and element reference - the handler must support mouse and touch contexts.
		Z.Utils.addEventListener(checkbox, checkEvnt, checkEvntHndlr);
		Z.Utils.addEventListener(checkbox, 'touchstart', checkEvntHndlr);

		// Set tooltip visibility per optional parameter.
		if (tooltipsVisible && Z.Utils.stringValidate(tooltipResource)) { checkbox.title = Z.Utils.getResource(tooltipResource); }

		return containerBox;
	},

	Graphic : function (vwrIntID, id, graphicPath, graphic, w, h, x, y, altResource, tooltipsVisible) {
		// Load image for graphic.
		graphicPath = Z.Utils.stringRemoveTrailingSlashCharacters(graphicPath);
		var graphicPathFull = (graphic) ? graphicPath + '/' + graphic : graphicPath;
		var img = Z.Utils.createGraphicElement(vwrIntID, graphicPathFull);
		var igS = img.style;
		igS.width = w;
		igS.height = h;

		// Set image alt attribute for accessibility compliance.
		if (typeof altResource !== 'undefined' && Z.Utils.stringValidate(altResource)) {
			img.alt = Z.Utils.getResource(altResource);
		} else {
			img.alt = '';
		}

		// Create graphic element and add image to it.
		var graphic = Z.Utils.createContainerElement(vwrIntID, 'span', id, 'inline-block', 'absolute', 'hidden', w, h, x, y, 'none', '0px', 'transparent none', '0px', '0px', 'normal');
		graphic.appendChild(img);
		this.elmt = graphic;

		// Prevent graphic dragging and disable context menu.
		Z.Utils.addEventListener(img, 'mousedown', Z.Utils.preventDefault);
		Z.Utils.addEventListener(img, 'touchstart', Z.Utils.preventDefault);
		Z.Utils.addEventListener(img, 'contextmenu', Z.Utils.preventDefault);
		
		// Set tooltip visibility per optional parameter.
		if (tooltipsVisible && Z.Utils.stringValidate(altResource)) { graphic.title = Z.Utils.getResource(altResource); }
	},

	createGraphicElement : function (vwrIntID, imageSrc) {
		var gImg = this.createContainerElement(vwrIntID, 'img');
		var gElmt = null;
		if (Z.browser == Z.browsers.IE && Z.browserVersion < 7) {
			gElmt = this.createContainerElement(vwrIntID, 'span', null, 'inline-block');
			gImg.onload = function () {
				gElmt.style.width = gElmt.style.width || gImg.width + 'px';
				gElmt.style.height = gElmt.style.height || gImg.height + 'px';
				gImg.onload = null;
				gImg = null;
			};
			gElmt.style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + imageSrc + '", sizingMethod="scale")';
		} else {
			gElmt = gImg;
			gElmt.src = imageSrc;
		}
		return gElmt;
	},

	graphicSize : function (targetGphc, w, h) {
			var gS = targetGphc.style;
			gS.width = w + 'px';
			gS.height = h + 'px';
			var img = targetGphc.firstChild;
			var imgS = img.style;
			imgS.width = w + 'px';
			imgS.height = h + 'px';
	},

	Slider : function (vwrIntID, id, container, skinPath, skinArr, btnEvntsHndlr, txtEvntsHndlr, range, rangeClear, tooltipsVisible) {
		var idUpperFirst = Z.Utils.stringUpperCaseFirstLetter(id);
		var idUpperAll = id.toUpperCase();		
		if (rangeClear) { idUpperAll = labelTxt.substring(0, idUpperAll.indexOf('RANGE')); }
		var labelTextBox = Z.Utils.createContainerElement(vwrIntID, 'div', 'label' + idUpperFirst + 'TextBox', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent none', '0px', '0px', 'nowrap', null, true);
		var labelTextNode = document.createTextNode(Z.Utils.getResource('UI_IMAGEFILTERPANELLABEL' + idUpperAll));
		labelTextBox.appendChild(labelTextNode);
		container.appendChild(labelTextBox);
		var trackSliderFilter = new Z.Utils.Graphic(vwrIntID, 'trackSliderFilter' + idUpperFirst, skinPath, skinArr[15], '1px', '1px', '0px', '0px', 'TIP_SLIDER' + idUpperAll, tooltipsVisible);
		container.appendChild(trackSliderFilter.elmt);
		Z.Utils.addEventListener(trackSliderFilter.elmt, 'mousedown', btnEvntsHndlr);
		Z.Utils.addEventListener(trackSliderFilter.elmt, 'touchstart', btnEvntsHndlr);
		Z.Utils.addEventListener(trackSliderFilter.elmt, 'mouseover', btnEvntsHndlr);
		var buttonSliderFilter = new Z.Utils.Button(vwrIntID, 'buttonSliderFilter' + idUpperFirst, null, skinPath, skinArr[17], skinArr[18], skinArr[19], '1px', '1px', '1px', '1px',  'mouseover', btnEvntsHndlr, 'TIP_SLIDER' + idUpperAll, null, null, null, null, null, null, null, tooltipsVisible);
		container.appendChild(buttonSliderFilter.elmt);
		if (range) {
			var buttonSliderFilter = new Z.Utils.Button(vwrIntID, 'buttonSliderFilter' + idUpperFirst + '2', null, skinPath, skinArr[17], skinArr[18], skinArr[19], '1px', '1px', '1px', '1px',  'mouseover', btnEvntsHndlr, 'TIP_SLIDER' + idUpperAll + '2', null, null, null, null, null, null, null, tooltipsVisible);
			container.appendChild(buttonSliderFilter.elmt);
		}
		var sliderTextElement = Z.Utils.createTextElement(vwrIntID, id + 'TextElement', '0', '1px', '1px', '1px', '1px', '0px', 'solid', '1px', false, 'verdana', '1px', 'none', null, 1, 'hidden', 'hidden', 'off');
		Z.Utils.addEventListener(sliderTextElement.firstChild, 'focus', txtEvntsHndlr);
		Z.Utils.addEventListener(sliderTextElement.firstChild, 'input', txtEvntsHndlr);
		Z.Utils.addEventListener(sliderTextElement.firstChild, 'change', txtEvntsHndlr);
		Z.Utils.addEventListener(sliderTextElement.firstChild, 'blur', txtEvntsHndlr);
		container.appendChild(sliderTextElement);
		if (range) {
			var sliderTextElement = Z.Utils.createTextElement(vwrIntID, id + 'TextElement' + '2', '0', '1px', '1px', '1px', '1px', '0px', 'solid', '1px', false, 'verdana', '1px', 'none', null, 1, 'hidden', 'hidden', 'off');
			Z.Utils.addEventListener(sliderTextElement.firstChild, 'focus', txtEvntsHndlr);
			Z.Utils.addEventListener(sliderTextElement.firstChild, 'input', txtEvntsHndlr);
			Z.Utils.addEventListener(sliderTextElement.firstChild, 'change', txtEvntsHndlr);
			Z.Utils.addEventListener(sliderTextElement.firstChild, 'blur', txtEvntsHndlr);
			container.appendChild(sliderTextElement);
		}
	},

	Point : function (x, y) {
		this.x = typeof x === 'number' ? x : 0;
		this.y = typeof y === 'number' ? y : 0;
	},

	Point3D : function (x, y, z) {
		this.x = typeof x === 'number' ? x : 0;
		this.y = typeof y === 'number' ? y : 0;
		this.z = typeof z === 'number' ? z : 0;
	},
	
	preventSelection : function (element) {
		var elemS = element.style;
		elemS['-webkit-touch-callout'] = 'none';
		elemS['-moz-user-select'] = 'none';
		//elemS['-moz-user-select'] = '-moz-none'; // Pre Firefox v31
		elemS['-khtml-user-select'] = 'none';
		elemS['-webkit-user-select'] = 'none';
		elemS['-ms-user-select'] = 'none';
		elemS['-o-user-select'] = 'none';
		elemS['user-select'] = 'none';
	},
	
	Coordinates : function (x, y, z, r) {
		this.x = typeof x === 'number' ? x : 0;
		this.y = typeof y === 'number' ? y : 0;
		this.z = typeof z === 'number' ? z : 0;
		this.r = typeof r === 'number' ? r : 0;
	},

	CoordinatesDisplayStyle : function (cLeft, cTop, vWidth, vHeight, vLeft, vTop, bWidth, bHeight, bLeft, bTop, cRotation) {
		this.cLeft = cLeft;
		this.cTop = cTop;
		this.vWidth = vWidth;
		this.vHeight = vHeight;
		this.vLeft = vLeft;
		this.vTop = vTop;
		this.bWidth = bWidth;
		this.bHeight = bHeight;
		this.bLeft = bLeft;
		this.bTop = bTop;
		this.cRotation = cRotation;
	},

	Pair : function (a, b) {
		this.a = a;
		this.b = b;
	},

	Trio : function (a, b, c) {
		this.a = a;
		this.b = b;
		this.c = c;
	},

	Range : function (start, end) {
		this.start = typeof start === 'number' ? start : 0;
		this.end = typeof end === 'number' ? end : 0;
	},

	RangeScale : function (min, max) {
		this.min = typeof min === 'number' ? min : 0;
		this.max = typeof max === 'number' ? max : 0;
	},

	// Function requires improvement to deal with 'auto' values. Current workaround OK for swapping Comparison viewports.
	swapZIndices : function (baseZIndex, element1, element2) {
		var zIndex1 = Z.Utils.getElementStylePropertyZIndex(element1);
		var zIndex2 = Z.Utils.getElementStylePropertyZIndex(element2);
		if (zIndex1 == 'auto' || zIndex2 == 'auto') {
			zIndex1 = (baseZIndex - 101).toString();
			zIndex2 = (baseZIndex - 100).toString();
		}
		element1.style.zIndex = zIndex2;
		element2.style.zIndex = zIndex1;
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::: COLOR, STRING, TEXT STYLE UTILITY FUNCTIONS :::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	stringValidate : function (str) {
		return (typeof str !== 'undefined' && str !== null && str !== '' && str !== 'null'); // Final check for 'null' string value added for XML uses.
	},

	// Replace spaces to make escaped XML easier to read. Not currently required due to minimal escaping by function xmlEscapeMinimal.
	stringReadable : function (stringToModify) {
		var stringToReplace;
		var regularExpression;
		var stringToInsert;
		var modifiedString;

		// DEV NOTE: Replace single quotes (apostrophes).
		stringToReplace = "%20";
		regularExpression = new RegExp(stringToReplace, "g");
		stringToInsert = " ";
		modifiedString = stringToModify.replace(regularExpression, stringToInsert);

		// DEV NOTE: To replace other characters, replicate four preceeding code lines here:

		return modifiedString;
	},

	stringGetInitials : function (str) {
		var initialsStrUp = '';
		if (str) {
			var initials = str.replace(/[^a-zA-Z- ]/g, "").match(/\b\w/g);
			var initialsStr = initials.join('');
			initialsStrUp = initialsStr.toUpperCase();
		}
		return initialsStrUp;
	},

	stringLowerCaseFirstLetter : function (str) {
		return str.charAt(0).toLowerCase() + str.slice(1);
	},

	stringUpperCaseFirstLetter : function (str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	},
		
	stringSubtract : function (str, strEndRemove) {
		if (typeof str !== 'undefined') {
			var index = str.lastIndexOf(strEndRemove);
			if (index != -1) { str = str.substring(0, index); }
		}
		return str;
	},

	stringMultiply : function (str, num) {
		var i = Math.ceil(Math.log(num) / Math.LN2);
		var result = str;
		do {
			result += result;
		} while (0 < --i);
		return result.slice(0, str.length * num);
	},

	stringPadFront : function (strVal, strChars, charVal) {
		var padChars = (strChars - strVal.length);
		var padding = Z.Utils.stringMultiply(charVal, padChars);
		strVal = padding + strVal;
		return strVal;
	},

	stringRemoveLeadingZeros : function (stringToClean) {
		var stringCleaned = '';
		if (typeof stringToClean !== 'undefined' && stringToClean !== null) {
			stringCleaned = (stringToClean.length > 1 && stringToClean.slice(0, 1) == '0' && stringToClean.slice(1, 2) != '.') ? stringToClean.slice(1, stringToClean.length) : stringToClean;
		}
		return stringCleaned;
	},

	stringRemoveDuplicateDots : function (stringToClean) {
		var stringCleaned = '';
		if (typeof stringToClean !== 'undefined' && stringToClean !== null) {
			var dotIndex = stringToClean.indexOf('.');
			stringCleaned = stringToClean.replace(/\./g, '');
			if (dotIndex != -1) {
				stringCleaned = stringCleaned.slice(0, dotIndex) + '.' + stringCleaned.slice(dotIndex);
			}
		}
		return stringCleaned;
	},

	stringRemoveTrailingSlashCharacters : function (stringToClean) {
		var stringCleaned = (typeof stringToClean === 'undefined' || stringToClean === null) ? '' : (stringToClean.slice(-1, stringToClean.length) == '/') ? stringToClean.slice(0, stringToClean.length - 1) : stringToClean;
		// Next line removed to allow for leading slash signifying root context.
		//stringCleaned = (stringToClean.slice(0, 1) == '/') ? stringToClean.slice(1, stringToClean.length) : stringToClean;
		return stringCleaned;
	},

	stringRemoveFileExtension : function (stringToClean) {
		var len = stringToClean.length;
		if (stringToClean.slice(len - 4, len - 3) == '.') { stringToClean = stringToClean.slice(0, len - 4); }
		return stringToClean;
	},

	stringRemoveTabAndLineWrapCharacters : function (stringToClean) {
		var stringCleaned = stringToClean.replace(/\n/g, '');
		stringCleaned = stringCleaned.replace(/\r/g, '');
		stringCleaned = stringCleaned.replace(/\t/g, '');
		return stringCleaned;
	},

	stringUnescapeAmpersandCharacters : function (stringToClean) {
		var stringCleaned = stringToClean.replace(/\n/g, '');
		stringCleaned = stringCleaned.replace(/&#38;/g, '&');
		stringCleaned = stringCleaned.replace(/&#038;/g, '&');
		stringCleaned = stringCleaned.replace(/&amp;/g, '&');
		return stringCleaned;
	},

	setHTMLTextDefaultCaptionStyle : function (htmlTextNode, HTML, color, fontFamily, fontSize, fontSizeAdjust, fontStyle, fontStretch, fontVariant, fontWeight, lineHeight, textAlign, textDecoration) {
		var htmlTextStyle = htmlTextNode.style;
		if (HTML.indexOf('color=') == -1) { htmlTextStyle.color = color; }
		if (HTML.indexOf('font-family=') == -1) { htmlTextStyle.fontFamily = fontFamily; }
		if (HTML.indexOf('font-size=') == -1) { htmlTextStyle.fontSize = fontSize; }
		if (HTML.indexOf('font-size-adjust=') == -1) { htmlTextStyle.fontSizeAdjust = fontSizeAdjust; }
		if (HTML.indexOf('font-style=') == -1) { htmlTextStyle.fontStyle = fontStyle; }
		if (HTML.indexOf('font-stretch=') == -1) { htmlTextStyle.fontStretch = fontStretch; }
		if (HTML.indexOf('font-variant=') == -1) { htmlTextStyle.fontVariant = fontVariant; }
		if (HTML.indexOf('font-weight=') == -1) { htmlTextStyle.fontWeight = fontWeight; }
		if (HTML.indexOf('line-height=') == -1) { htmlTextStyle.lineHeight = lineHeight; }
		if (HTML.indexOf('text-align=') == -1) { htmlTextStyle.textAlign = textAlign; }
		if (HTML.indexOf('text-decoration=') == -1) { htmlTextStyle.textDecoration = textDecoration; }
	},

	setHTMLTextStyle : function (htmlTextNode, color, fontFamily, fontSize, fontSizeAdjust, fontStyle, fontStretch, fontVariant, fontWeight, lineHeight, textAlign, textDecoration) {
		var htmlTextStyle = htmlTextNode.style;
		htmlTextStyle.color = color;
		htmlTextStyle.fontFamily = fontFamily;
		htmlTextStyle.fontSize = fontSize;
		htmlTextStyle.fontSizeAdjust = fontSizeAdjust;
		htmlTextStyle.fontStyle = fontStyle;
		htmlTextStyle.fontStretch = fontStretch;
		htmlTextStyle.fontVariant = fontVariant;
		htmlTextStyle.fontWeight = fontWeight;
		htmlTextStyle.lineHeight = lineHeight;
		htmlTextStyle.textAlign = textAlign;
		htmlTextStyle.textDecoration = textDecoration;
	},

	setTextAreaStyle : function (textBox, color, fontFamily, fontSize, fontSizeAdjust, fontStyle, fontStretch, fontVariant, fontWeight, lineHeight, textAlign, textDecoration, padding) {
		var tStyle = textBox.firstChild.style;
		tStyle.color = color;
		tStyle.fontFamily = fontFamily;
		tStyle.fontSize = fontSize;
		tStyle.fontSizeAdjust = fontSizeAdjust;
		tStyle.fontStyle = fontStyle;
		tStyle.fontStretch = fontStretch;
		tStyle.fontVariant = fontVariant;
		tStyle.fontWeight = fontWeight;
		tStyle.lineHeight = lineHeight;
		tStyle.textAlign = textAlign;
		tStyle.textDecoration = textDecoration;
		tStyle.padding = padding;
	},

	setTextNodeStyle : function (textNode, color, fontFamily, fontSize, fontSizeAdjust, fontStyle, fontStretch, fontVariant, fontWeight, lineHeight, textAlign, textDecoration) {
		var tStyle = textNode.parentNode.style;
		tStyle.color = color;
		tStyle.fontFamily = fontFamily;
		tStyle.fontSize = fontSize;
		tStyle.fontSizeAdjust = fontSizeAdjust;
		tStyle.fontStyle = fontStyle;
		tStyle.fontStretch = fontStretch;
		tStyle.fontVariant = fontVariant;
		tStyle.fontWeight = fontWeight;
		tStyle.lineHeight = lineHeight;
		tStyle.textAlign = textAlign;
		tStyle.textDecoration = textDecoration;
	},
	
	// Numeric validation does not use parseFloat as would block decimal values during text field entry.
	// DEV NOTE: This can be streamlined with multiple or improved replace expression.
	stringValidateNumberValue: function (value) {
		var returnVal = ''; // Do not force to 0 if empty as unintuitive for user attempting clear 0 to enter a value. Blur will set to 0 if exit with field empty.
		if (typeof value !== 'undefined' && Z.Utils.stringValidate(value)) {			
			returnVal = value.replace(/(?!^-)[^0-9.]/g, '');
			returnVal = Z.Utils.stringRemoveLeadingZeros(returnVal);
			returnVal = Z.Utils.stringRemoveDuplicateDots(returnVal);
		}
		return returnVal;
	},

	stringValidateColorValue : function (value) {
		if (!Z.Utils.stringValidate(value)) { value = '#000000'; }
		if (value.indexOf('#') != 0) { value = '#' + value; }
		return value;
	},

	hexToRGB : function (hexStr) {
		// Expand shorthand to full form.
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hexStr = hexStr.replace(shorthandRegex, function(m, r, g, b) {
			return r + r + g + g + b + b;
		});

		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexStr);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::: XML & JSON UTILITY FUNCTIONS ::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	xmlConvertTextToDoc : function (xmlText) {
		var xmlDoc = null;
		if (window.ActiveXObject) {
			try {
				xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
				xmlDoc.async = false;
				xmlDoc.loadXML(xmlText);
			} catch (e) {
				alert(e.name + this.getResource('ERROR_CONVERTINGXMLTEXTTODOC') + e.message);
			}
		} else if (window.DOMParser) {
			try {
				var parser = new DOMParser();
				xmlDoc = parser.parseFromString(xmlText, 'text/xml');
			} catch (e) {
				alert(e.name + this.getResource('ERROR_CONVERTINGXMLTEXTTODOC') + e.message);
			}
		} else {
			alert(this.getResource('ERROR_XMLDOMUNSUPPORTED'));
		}
		return xmlDoc;
	},

	xmlConvertDocToText : function (xmlDoc) {
		var xmlText = null;
		if (window.ActiveXObject) {
			try {
				xmlText = xmlDoc.xml;
			} catch (e) {
				alert(e.name + this.getResource('ERROR_CONVERTINGXMLDOCTOTEXT') + e.message);
			}
		} else if (window.DOMParser) {
			try {
				xmlText = (new XMLSerializer()).serializeToString(xmlDoc);
			} catch (e) {
				alert(e.name + this.getResource('ERROR_CONVERTINGXMLDOCTOTEXT') + e.message);
			}
		} else {
			alert(this.getResource('ERROR_XMLDOMUNSUPPORTED'));
		}
		return xmlText;
	},

	xmlEscapeMinimal : function (content) {
		var repCont = null;
		if (typeof content !== 'undefined' && content !== null) {
			repCont = content.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&apos;')
				.replace(/\r?\n/g, '%0A');
		}
		return repCont;
	},

	xmlUnescapeMinimal : function (content) {
		var repCont = null;
		if (typeof content !== 'undefined' && content !== null) {
			repCont = content.replace(/%0A/g, '\n')
				.replace(/&apos;/g, "'")
				.replace(/&quot;/g, '"')
				.replace(/&gt;/g, '>')
				.replace(/&lt;/g, '<')
				.replace(/&amp;/g, "&");
		}
		return repCont;
	},

	// Convert encoding of these characters: \n @ # $ % ^ & = + : ; " \ / ? < > [ ] { } ` '
	xmlEscapingConvertURIToHTML : function (content) {
		var repCont = null;
		if (typeof content !== 'undefined' && content !== null) {
			repCont = content.replace(/%0A/g, '\n')
				.replace(/%40/g, '&#64;')
				.replace(/%23/g, '&#35;')
				.replace(/%24/g, '&#36;')
				.replace(/%25/g, '&#37;')
				.replace(/%5E/g, '&#94;')
				.replace(/%26/g, '&#38;')
				.replace(/%3D/g, '&#61;')
				.replace(/%2B/g, '&#43;')
				.replace(/%3A/g, '&#58;')
				.replace(/%3B/g, '&#59;')
				.replace(/%22/g, '&#34;')
				.replace(/%5C/g, '&#92;')
				.replace(/%2F/g, '&#47;')
				.replace(/%3F/g, '&#63;')
				.replace(/%3C/g, '&#60;')
				.replace(/%3E/g, '&#62;')
				.replace(/%5B/g, '&#91;')
				.replace(/%5D/g, '&#93;')
				.replace(/%7B/g, '&#123;')
				.replace(/%7D/g, '&#125;')
				.replace(/%60/g, '&#96;')
				.replace(/%27/g, '&#39;');
		}
		return repCont;
	},

	// Convert encoding of these characters: \n @ # $ % ^ & = + : ; " \ / ? < > [ ] { } ` '
	xmlEscapingConvertHTMLToURI : function (content) {
		var repCont = null;
		if (typeof content !== 'undefined' && content !== null) {
			repCont = content.replace(/\n/g, '%0A')			
				.replace(/&apos;/g, '%27')
				.replace(/&quot;/g, '%22')
				.replace(/&gt;/g, '%3E')
				.replace(/&lt;/g, '%3C')
				.replace(/&amp;/g, '%26')			
				.replace(/&#64;/g, '%40')
				.replace(/&#35;/g, '%23')
				.replace(/&#36;/g, '%24')
				.replace(/&#37;/g, '%25')
				.replace(/&#94;/g, '%5E')
				.replace(/&#38;/g, '%26')
				.replace(/&#61;/g, '%3D')
				.replace(/&#43;/g, '%2B')
				.replace(/&#58;/g, '%3A')
				.replace(/&#59;/g, '%3B')
				.replace(/&#34;/g, '%22')
				.replace(/&#92;/g, '%5C')
				.replace(/&#47;/g, '%2F')
				.replace(/&#63;/g, '%3F')
				.replace(/&#60;/g, '%3C')
				.replace(/&#62;/g, '%3E')
				.replace(/&#91;/g, '%5B')
				.replace(/&#93;/g, '%5D')
				.replace(/&#123;/g, '%7B')
				.replace(/&#125;/g, '%7D')
				.replace(/&#96;/g, '%60')
				.replace(/&#39;/g, '%27');				
		}
		return repCont;
	},

	// This is a not a generic JSON to XML conversion function.  It is tailored to the objects in this application (CDATA not currently supported).
	jsonConvertObjectToXMLText : function (jsonObject) {
		var convertToXML = function (pValue, pName) {
			var xmlNew = '';
			if (pValue instanceof Array) {
				for (var i = 0, j = pValue.length; i < j; i++) {
					xmlNew += convertToXML(pValue[i], pName) + '\n';
				}
			} else if (typeof pValue === 'object') {
				var hasChild = false;
				xmlNew += '<' + pName;
				for (var propName in pValue) {
					if (typeof pValue[propName] !== 'object') {
						xmlNew += ' ' + propName + '=\"' + pValue[propName].toString() + '\"';
					} else {
						hasChild = true;
					}
				}

				// DEV NOTE: Workaround for 'object' test causing redundant close.
				xmlNew += '>'; //xmlNew += hasChild ? '>' : '/>';
				if (hasChild) {
					for (var propName in pValue) {
						if (propName == '#text') {
							xmlNew += pValue[propName];
						} else if (typeof pValue[propName] === 'object') {
							xmlNew += convertToXML(pValue[propName], propName);
						}
					}
				}
				xmlNew += '</' + pName + '>';
			} else {
				xmlNew += '<' + pName + '>' + pValue.toString() +  '</' + pName + '>';
			}
			return xmlNew;
		}, xmlNew='';

		for (var propName in jsonObject) {
			xmlNew += convertToXML(jsonObject[propName], propName);
		}

		// Excape or remove characters in fields that will interfere with parameter parsing.
		var xmlOut = xmlNew.replace(/&/g, '&amp;')
				.replace(/\t|\n/g, '');

		// Debug option: Compare values loaded and converted.
		//console.log('JSON object in: ' + JSON.stringify(jsonObject, null, ' '));
		//console.log('XML out: ' + xmlOut);

		return xmlOut;
	},

	// This is a not a generic XML to JSON conversion function.  It is tailored to the objects in this application (CDATA not currently supported).
	jsonConvertXMLTextToJSONText : function (xmlIn) {

		var Converter = {

			convertToObject : function (xml) {
				var cvrtObj = {};
				if (xml.nodeType == 1) {
					if (xml.attributes.length) {
						for (var i = 0, j = xml.attributes.length; i < j; i++) {
							cvrtObj[xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue||'').toString();
						}
					}
					if (xml.firstChild) {
						var textChild = 0, hasElementChild = false;
						for (var n = xml.firstChild; n; n = n.nextSibling) {
							if (n.nodeType == 1) {
								hasElementChild = true;
							} else if (n.nodeType == 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
								textChild++;
							}
						}
						if (hasElementChild) {
							if (textChild < 2) {
								Converter.reduceWhitespace(xml);
								for (var n = xml.firstChild; n; n = n.nextSibling) {
									if (n.nodeType == 3) {
										cvrtObj['#text'] = Converter.escapeMinimal(n.nodeValue);
									} else if (cvrtObj[n.nodeName]) {
										if (cvrtObj[n.nodeName] instanceof Array) {
											cvrtObj[n.nodeName][cvrtObj[n.nodeName].length] = Converter.convertToObject(n);
										} else {
											cvrtObj[n.nodeName] = [cvrtObj[n.nodeName], Converter.convertToObject(n)];
										}
									} else {
										cvrtObj[n.nodeName] = Converter.convertToObject(n);
									}
								}
							} else {
								if (!xml.attributes.length) {
									cvrtObj = Converter.escapeMinimal(Converter.innerXML(xml));
								} else {
									cvrtObj['#text'] = Converter.escapeMinimal(Converter.innerXML(xml));
								}
							}
						} else if (textChild) {
							if (!xml.attributes.length) {
								cvrtObj = Converter.escapeMinimal(Converter.innerXML(xml));
							} else {
								cvrtObj['#text'] = Converter.escapeMinimal(Converter.innerXML(xml));
							}
						}
					}
					if (!xml.attributes.length && !xml.firstChild) {
						cvrtObj = null;
					}
				} else if (xml.nodeType == 9) {
					cvrtObj = Converter.convertToObject(xml.documentElement);
				} else {
					alert('This node type not supported : ' + xml.nodeType);
				}
				return cvrtObj;
			},

			convertToJSONText : function (cvrtObj, name) {
				var jsonTxt = name ? ('\"' + name + '\"') : '';
				if (cvrtObj instanceof Array) {
					for (var i = 0, n = cvrtObj.length; i < n; i++) {
						cvrtObj[i] = Converter.convertToJSONText(cvrtObj[i], '', '\t');
					}
					jsonTxt += (name ? ':[' : '[') + (cvrtObj.length > 1 ? ('\n' + '\t' + cvrtObj.join(',\n' + '\t') + '\n') : cvrtObj.join('')) + ']';
				} else if (cvrtObj == null) {
					jsonTxt += (name && ':') + 'null';
				} else if (typeof(cvrtObj) === 'object') {
					var arrJTxt = [];
					for (var m in cvrtObj) {
						arrJTxt[arrJTxt.length] = Converter.convertToJSONText(cvrtObj[m], m, '\t');
					}
					jsonTxt += (name ? ':{' : '{') + (arrJTxt.length > 1 ? ('\n' + '\t' + arrJTxt.join(',\n' + '\t') + '\n') : arrJTxt.join('')) + '}';
				} else if (typeof(cvrtObj) == 'string') {
					jsonTxt += (name && ':') + '\"' + cvrtObj.toString() + '\"';
				} else {
					jsonTxt += (name && ':') + cvrtObj.toString();
				}
				return jsonTxt;
			},
		
			reduceWhitespace : function (xmlToReduce) {
				xmlToReduce.normalize();
				for (var n = xmlToReduce.firstChild; n; ) {
					if (n.nodeType == 3) {
						if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
							var nxt = n.nextSibling;
							xmlToReduce.removeChild(n);
							n = nxt;
						} else {
							n = n.nextSibling;
						}
					} else if (n.nodeType == 1) {
						Converter.reduceWhitespace(n);
						n = n.nextSibling;
					} else {
						n = n.nextSibling;
					}
				}
				return xmlToReduce;
			},

			escapeMinimal : function (content) {
				return content.replace(/[\\]/g, '\\\\')
					.replace(/[\"]/g, '\\"')
					.replace(/[\n]/g, '\\n')
					.replace(/[\r]/g, '\\r');
			},

			innerXML : function (node) {
				var toXML = '';
				if ('innerHTML' in node) {
					toXML = node.innerHTML;
				} else {
					var asXML = function (n) {
						var toXML = '';
						if (n.nodeType == 1) {
							toXML += '<' + n.nodeName;
							for (var i = 0, j = n.attributes.length; i < j; i++) {
								toXML += ' ' + n.attributes[i].nodeName + '=\'' + (n.attributes[i].nodeValue||'').toString() + '\'';
							}
							if (n.firstChild) {
								toXML += '>';
								for (var childNode = n.firstChild; childNode; childNode = childNode.nextSibling) {
									toXML += asXML(childNode);
								}
								toXML += '</' + n.nodeName + '>';
							} else {
								toXML += '/>';
							}
						} else if (n.nodeType == 3) {
							toXML += n.nodeValue;
						}
						return toXML;
					};
					for (var childNode = node.firstChild; childNode; childNode = childNode.nextSibling) {
						toXML += asXML(childNode);
					}
				}
				return toXML;
			}
		};
		
		if (xmlIn.nodeType == 9) {
			xml = xml.documentElement;
		}

		var jsonText = Converter.convertToJSONText(Converter.convertToObject(Converter.reduceWhitespace(xmlIn)), xmlIn.nodeName, '\t');
		jsonTextOut = '{\n' + '  ' + ('  ' ? jsonText.replace(/\t/g, '  ') : jsonText.replace(/\t|\n/g, '')) + '\n}';

		// Debug option: Compare values loaded and converted.
		//console.log('XML text in: \n' + Z.Utils.xmlConvertDocToText(xmlIn));
		//console.log('JSON text out: \n' + jsonTextOut);

		return jsonTextOut;
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::: ARRAY UTILITY FUNCTIONS ::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Deletes all elements. Note that arr = []; creates new empty array and leaves any referenced original
	// array unchanged. Also note that this approach performs up to 10x faster than arr.length = 0;
	arrayClear : function (arr) {
		if (arr) {
			while(arr.length > 0) {
			    arr.pop();
			}
		}
	},

	arrayClearObjectValue : function (arr, subobj) {
		for (var i = 0, j = arr.length; i < j; i++) {
			arr[i][subobj] = null;
		}
	},

	// This is a not a generic deep object copy function.  It is a three-level copy function for specific objects in this application.
	arrayClone : function (arrName, arrFrom, arrTo) {
		arrTo = [];
		switch (arrName) {
			case 'pois' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = { text:arrFrom[i].text, value:arrFrom[i].value, id:arrFrom[i].id, x:arrFrom[i].x, y:arrFrom[i].y, z:arrFrom[i].z, user:arrFrom[i].user, date:arrFrom[i].date, editable:arrFrom[i].editable };
				}
				break;
			case 'labels' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = { text:arrFrom[i].text, value:arrFrom[i].value, poiID:arrFrom[i].poiID, editable:arrFrom[i].editable };
				}
				break;
			case 'hotspots' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = {
						id: arrFrom[i].id,
						name: arrFrom[i].name,
						mediaType: arrFrom[i].mediaType,
						media: arrFrom[i].media,
						audio: arrFrom[i].audio,
						x: arrFrom[i].x,
						y: arrFrom[i].y,
						z: arrFrom[i].z,
						xScale: arrFrom[i].xScale,
						yScale: arrFrom[i].yScale,
						radius: arrFrom[i].radius,
						zMin: arrFrom[i].zMin,
						zMax: arrFrom[i].zMax,
						clickURL: arrFrom[i].clickURL,
						urlTarget: arrFrom[i].urlTarget,
						rollover: arrFrom[i].rollover,
						caption: arrFrom[i].caption,
						tooltip: arrFrom[i].tooltip,
						textColor: arrFrom[i].textColor,
						backColor: arrFrom[i].backColor,
						lineColor: arrFrom[i].lineColor,
						fillColor: arrFrom[i].fillColor,
						textVisible: arrFrom[i].textVisible,
						backVisible: arrFrom[i].backVisible,
						lineVisible: arrFrom[i].lineVisible,
						fillVisible: arrFrom[i].fillVisible,
						captionPosition: arrFrom[i].captionPosition,
						saved: arrFrom[i].saved,
						visibility: arrFrom[i].visibility,
						internalID: arrFrom[i].internalID,
						poiID: arrFrom[i].poiID,
						captionHTML: arrFrom[i].captionHTML,
						tooltipHTML: arrFrom[i].tooltipHTML,
						polyClosed: arrFrom[i].polyClosed,
						polygonPts: arrFrom[i].polygonPts,
						showFor: arrFrom[i].showFor,
						transition: arrFrom[i].transition,
						changeFor: arrFrom[i].changeFor,
						rotation: arrFrom[i].rotation,
						editable: arrFrom[i].editable,
						popup: arrFrom[i].popup,
						popupOffsetX: arrFrom[i].popupOffsetX,
						popupOffsetY: arrFrom[i].popupOffsetY,
						comment: arrFrom[i].comment,
						user: arrFrom[i].user,
						date: arrFrom[i].date,
						iW: arrFrom[i].iW,
						iH: arrFrom[i].iH,
						image: arrFrom[i].image
					 };
				}
				break;
			case 'polygon' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = { x:arrFrom[i].x, y:arrFrom[i].y };
				}
				break;
			case 'notes' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = { text:arrFrom[i].text, value:arrFrom[i].value, noteText:arrFrom[i].noteText, poiID:arrFrom[i].poiID, id:arrFrom[i].id, user:arrFrom[i].user, date:arrFrom[i].date, editable:arrFrom[i].editable };
				}
				break;
			case 'magnifications' :
				for (var i = 0, j = arrFrom.length; i < j; i++) {
					arrTo[arrTo.length] = { text:arrFrom[i].text, value:arrFrom[i].value };
				}
				break;
		}
		return arrTo;
	},

	// Assumes object including 'image' property.
	arrayImageLoadingValidate : function (arrOfImages) {
		var imagesReady = false;
		if (arrOfImages && arrOfImages.length > 0) {
			imagesReady = true;
			for (var i = 0, j = arrOfImages.length; i < j; i++) {
				if (arrOfImages[i] === null || arrOfImages[i].image.width == 0 || arrOfImages[i].image.height == 0) {
					imagesReady = false;
				}
			}
		}
		return imagesReady;
	},

	arrayIndexOf : function (arr, obj, fromIndex) {
		if (!fromIndex) {
			fromIndex = 0;
		} else if (fromIndex < 0) {
			fromIndex = Math.max(0, arr.length + fromIndex);
		}
		for (var i = fromIndex, j = arr.length; i < j; i++) {
			if (arr[i] === obj) { return i; }
		}
		return -1;
	},

	arrayIndexOfObjectValue : function (arr, subobj, obj, fromIndex) {
		if (typeof arr !== 'undefined') {
			if (!fromIndex) {
				fromIndex = 0;
			} else if (fromIndex < 0) {
				fromIndex = Math.max(0, arr.length + fromIndex);
			}
			for (var i = fromIndex, j = arr.length; i < j; i++) {
				if (arr[i][subobj] === obj) { return i; }
			}
		}
		return -1;
	},

	arrayIndexOfObjectTwoValues : function (arr, subobj, obj, fromIndex, subobj2, obj2) {
		if (typeof arr !== 'undefined') {
			if (!fromIndex) {
				fromIndex = 0;
			} else if (fromIndex < 0) {
				fromIndex = Math.max(0, arr.length + fromIndex);
			}
			for (var i = fromIndex, j = arr.length; i < j; i++) {
				if (arr[i][subobj] === obj) { // Find first match.
					if (arr[i][subobj2].toString() === obj2.toString()) { // Find second match. // DEV NOTE .toString MAY CONFICT WITH SOME USES.
						return i;
					}
				}
			}
		}
		return -1;
	},

	arrayIndexOfSubstring : function (arr, obj, fromIndex) {
		if (!fromIndex) {
			fromIndex = 0;
		} else if (fromIndex < 0) {
			fromIndex = Math.max(0, arr.length + fromIndex);
		}
		for (var i = fromIndex, j = arr.length; i < j; i++) {
			if (arr[i].indexOf(obj) != -1) { return i; }
		}
		return -1;
	},

	arrayIndexOfObjectValueSubstring : function (arr, subobj, obj, fromIndex, caseInsensitive) {
		if (!fromIndex) {
			fromIndex = 0;
		} else if (fromIndex < 0) {
			fromIndex = Math.max(0, arr.length + fromIndex);
		}
		for (var i = fromIndex, j = arr.length; i < j; i++) {
			if (caseInsensitive) {
				if (arr[i][subobj].toLowerCase().indexOf(obj) != -1) { return i; }
			} else {
				if (arr[i][subobj].indexOf(obj) != -1) { return i; }
			}
		}
		return -1;
	},

	// This function requires sorted arrays, each without duplicate values.
	arrayIntersect : function (a1, a2) {
		var elmt1, elmt2, found;
		var a3 = [];
		for (var i = 0, j = a1.length; i < j; i++) {
			elmt1 = a1[i];
			found = false;
			for (var k=0, m = a2.length; (k < m) && (elmt1 >= (elmt2 = a2[k])); k++) {
				if (elmt2 == elmt1) {
					found = true;
					break;
				}
			}
			if (found) { a3[a3.length] = a1[i]; }
		}
		return a3;
	},

	arrayMap : function (arr, fxn) {
		var arrOut = [];
		if (Z.arrayMapSupported) {
			arrOut = arr.map(fxn);
		} else {
			for(var i = 0, j = arr.length; i < j; i++) {
				arrOut[i] = fxn(arr[i]);
	   		}
		}
		return arrOut;
	},

	arraySplice : function (arr, iStart, iLength) {
		if (Z.arraySpliceSupported) {
			if (arguments.length > 3) {
				for (var i = 3, j = arguments.length; i < j; i++) {
					arr.splice(iStart, iLength, arguments[i]);
				}
			} else {
				arr.splice(iStart, iLength);
			}
		} else {
			if (iLength < 0) { iLength = 0; }
			var aInsert = [];
			if (arguments.length > 3) {
				for (var i = 3, j = arguments.length; i < j; i++) { aInsert[aInsert.length] = arguments[i]; }
			}
			var aHead = Z.Utils.arraySubarray(arr, 0, iStart);
			var aDelete = Z.Utils.arraySubarrayLen(arr, iStart, iLength);
			var aTail = Z.Utils.arraySubarray(arr, iStart + iLength);
			var aNew = aHead.concat(aInsert, aTail);
			arr.length = 0;
			for (var i = 0, j = aNew.length; i < j; i++) { arr[arr.length] = aNew[i]; }
			arr = aDelete;
		}
		return arr;
	},

	arraySubarraySimple : function (start, end) {
		return this.slice(start, end);
	},

	arraySortNumericAscending : function (arr, a, b) {
		arr.sort( function (a,b) { return a-b; } );
		return arr; // Fail-safe for empty arr.
	},

	arraySortNumericDescending : function (arr, a, b) {
		arr.sort( function (a,b) { return b-a; } );
		return arr; // Fail-safe for empty arr.
	},

	arraySortByObjectValue : function (arr, subobj, a, b) {
		arr.sort( function (a,b) { return a[subobj] > b[subobj]; } );
		return arr; // Fail-safe for empty arr.
	},

	arraySubarray : function (arr, iIndexA, iIndexB ) {
		if (iIndexA < 0) { iIndexA = 0; }
		if (!iIndexB || iIndexB > arr.length) { iIndexB = arr.length; }
		if (iIndexA == iIndexB) { return []; }
		var aReturn = [];
		for (var i = iIndexA; i < iIndexB; i++) {
			aReturn[aReturn.length] = arr[i];
		}
		return aReturn;
	},

	arraySubarrayLen : function (arr, iStart, iLength) {
		if (iStart >= arr.length || (iLength && iLength <= 0)) {
			return [];
		} else if (iStart < 0) {
			if (Math.abs(iStart) > arr.length) iStart = 0;
			else iStart = arr.length + iStart;
		}
		if (!iLength || iLength + iStart > arr.length) { iLength = arr.length - iStart; }
		var aReturn = [];
		for (var i = iStart; i < iStart + iLength; i++) {
			aReturn[aReturn.length] = arr[i];
		}
		return aReturn;
	},

	// This function requires sorted arrays, each without duplicate values.
	arraySubtract : function (a1, a2) {
		var aReturn = a1.slice(0);
		for (var i = 0, j = aReturn.length; i < j; i++) {
			var elmt1 = aReturn[i];
			var found = false;
			for (var k = 0, m = a2.length; (k < m) && (elmt1 >= (elmt2 = a2[k])); k++) {
				if (elmt2 == elmt1) {
					found = true;
					break;
				}
			}
			if (found) { aReturn = Z.Utils.arraySplice(aReturn, i--, 1); }
		}
		return aReturn;
	},

	arrayToArrayOfStrings : function (inputArr) {
		var outputArr = [];
		for (var i = 0, j = inputArr.length; i < j; i++) {
			outputArr[i] = !(typeof inputArr[i] === 'undefined' || inputArr[i] == 'undefined' || inputArr[i] === null) ? inputArr[i].toString() : '';
		}
		return outputArr;
	},

	// This function requires a sorted array.
	arrayUnique : function (arr) {
		for (var i = 1;i < arr.length;) {
			if (arr[i-1] == arr[i]) {
				arr = Z.Utils.arraySplice(arr, i, 1);
			} else{
				i++;
			}
		}
		return arr;
	},

	// This function requires a sorted array.
	arrayUniqueByObjectValue : function (arr, subobj) {
		if (typeof arr !== 'undefined') {
			for (var i = 1;i < arr.length;) {
				if (arr[i-1][subobj] == arr[i][subobj]) {
					arr = Z.Utils.arraySplice(arr, i, 1);
				} else{
					i++;
				}
			}
		}
		return arr;
	},

	dataSlice : function (arr, start, end) {
		var newArrSize = end - start;
		var result = new ArrayBuffer(end - start);
		var newArr = new Uint8Array(result);
		for(var i = 0; i < newArrSize; i++) {
			newArr[i] = arr[start + i];
		}
		return newArr;
	},

	calculatePointsDistance : function (x1, y1, x2, y2) {
		return Math.sqrt((x1 -= x2) * x1 + (y1 -= y2) * y1);

		// DEV NOTE: Alternative implementation:
		//return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
	},
	


	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::: SCREEN MODE, ROTATION, & TRANSLATION UTILITY FUNCTIONS ::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	fullScreenView : function (element, fullScreen, escaped, targetViewport) {
		// DEV NOTE: Watch for capitalization changes in specification and implementation: 'Fullscreen' vs 'FullScreen'.
		if (typeof escaped === 'undefined' || escaped === null) { var escaped = false; }

		if (fullScreen) {
			var docElm = document.documentElement;
			var eventString = null;
			if (docElm.requestFullScreen) {
				element.requestFullScreen();
				eventString = 'fullscreenchange'
			} else if (docElm.mozRequestFullScreen) {
				element.mozRequestFullScreen();
				eventString = 'mozfullscreenchange'
			} else if (docElm.webkitRequestFullScreen) {
				// DEV NOTE: Element.ALLOW_KEYBOARD_INPUT parameter blocks fullscreen mode in some versions of Chrome and Safari.
				// Testing for failed mode change allows second call without parameter in Safari but this workaround is not effective in Chrome.
				element.webkitRequestFullScreen();
				eventString = 'webkitfullscreenchange'
			} else if (docElm.msRequestFullscreen) {
				element.msRequestFullscreen();
				eventString = 'MSFullscreenChange'
			}
			if (eventString) { Z.Utils.addEventListener(document, eventString, targetViewport.fullScreenEscapeHandler); }

		} else {
			if (document.cancelFullScreen) {
				if (!escaped) { document.cancelFullScreen(); }
				eventString = 'fullscreenchange'
			} else if (document.mozCancelFullScreen) {
				if (!escaped) { document.mozCancelFullScreen(); }
				eventString = 'mozfullscreenchange'
			} else if (document.webkitCancelFullScreen) {
				if (!escaped) { document.webkitCancelFullScreen(); }
				eventString = 'webkitfullscreenchange'
			} else if (document.msExitFullscreen) {
				if (!escaped) { document.msExitFullscreen(); }
				eventString = 'MSFullscreenChange'
			}
			if (eventString) { Z.Utils.removeEventListener(document, eventString, targetViewport.fullScreenEscapeHandler); }
		}
	},

	rotatePoint : function (x, y, rotDegs) {
		var degToRad = Math.PI / 180;
		var rotRads = -rotDegs * degToRad;
		var newX = x * Math.cos(rotRads) - y * Math.sin(rotRads);
		var newY = x * Math.sin(rotRads) + y * Math.cos(rotRads);
		return new Z.Utils.Point(newX, newY);
	},

	rotateElement : function (displayS, r, imageR, override) {
		// DEV NOTE: Condition below is workaround for Safari mispositioning of hotspot captions after application of this method. This workaround only addresses unrotated displays.
		// Override ensures first condition does not block rotation of Navigator image as its r will equal targetViewer.imageR because it is always catching up to main display.
		if (typeof imageR === 'undefined' || imageR === null) { imageR = 0; }
		if (r != imageR || override) {
			var tranString = 'rotate(' + r.toString() + 'deg)';
			displayS.transform = tranString; // Standard.
			displayS.msTransform = tranString; // IE9.
			displayS.mozTransform = tranString; // Firefox.
			displayS.webkitTransform = tranString; // Chrome & Safari.
			displayS.oTransform = tranString; // Opera.
		}
	},

	getPositionRotated : function (pLeft, pTop, oLeft, oTop, r, imageR) {
		if (typeof r === 'undefined' || r === null) { r = imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.
		var rad = r * Math.PI / 180;
		var x = pLeft - oLeft;
		var y = pTop - oTop;
		var xRot = x * Math.cos(rad) - y * Math.sin(rad);
		var yRot = x * Math.sin(rad) + y * Math.cos(rad);
		var pLeftRot = Math.round(xRot + oLeft);
		var pTopRot = Math.round(yRot + oTop);
		return new Z.Utils.Point(pLeftRot, pTopRot);
	},

	getDisplayPositionRotated : function (displayS, r, imageR) {
		if (typeof r === 'undefined' || r === null) { r = imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.
		var pLeft = parseFloat(displayS.left);
		var pTop = parseFloat(displayS.top);
		var w = parseFloat(displayS.width);
		var h = parseFloat(displayS.height);
		var oLeft = pLeft + w / 2;
		var oTop = pTop + h / 2;
		var rotPoint = Z.Utils.getPositionRotated(pLeft, pTop, oLeft, oTop, r, imageR);
		return rotPoint;
	},

	translateElement : function (displayS, x, y) {
		var tranString = 'translate(' + x.toString() + 'px,' + y.toString() +'px)';
		displayS.transform = tranString; // Standard.
		displayS.msTransform = tranString; // IE9.
		displayS.mozTransform = tranString; // Firefox.
		displayS.webkitTransform = tranString; // Chrome & Safari.
		displayS.oTransform = tranString; // Opera.
	},

	scaleElement : function (displayS, scaleVal) {
		var scaleString = 'scale(' + scaleVal.toString() + ')';
		displayS.transform = scaleString; // Standard.
		displayS.msTransform = scaleString; // IE9.
		displayS.mozTransform = scaleString; // Firefox.
		displayS.webkitTransform = scaleString; // Chrome & Safari.
		displayS.oTransform = scaleString; // Opera.
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::: ZIF UTILITY FUNCTIONS :::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	intValue : function (array, offset, pffMotorolaByteOrder) {
		var returnVal = null;
		if (!pffMotorolaByteOrder) {
			returnVal =(array[offset] + (array[offset + 1] << 8) | (array[offset + 2] << 16)) + (array[offset + 3] * 16777216);
		} else {
			returnVal = (array[offset+3] + (array[offset + 2] << 8) | (array[offset + 1] << 16)) + (array[offset] * 16777216);
		}
		return returnVal;
	},

	longValue : function (array, offset, pffMotorolaByteOrder) {
		var returnVal = null;
		if (!pffMotorolaByteOrder) {
			returnVal = (array[offset] + (array[offset + 1] << 8) | (array[offset + 2] << 16)) + (array[offset + 3] * 16777216);
			if (array[offset + 4] != 0) { returnVal = returnVal + array[offset + 4] * 4294967296; }
		} else {
			returnVal = 0;
			var multiplier = 1;
			for (var i = 0; i < 8; i++) {
				returnVal += array[offset + 7 - i ] * multiplier;
				multiplier *= 256;		
			}
		}
		return returnVal;
	},

	shortValue : function (array, offset) {
		return array[offset] + (array[offset + 1] << 8);
	},

	createUint8Array : function (array, offset) {
		if (Z.uInt8ArraySupported) {
			return new Uint8Array(array, offset);
		} else {
			return new Z.Utils.TypedArray(array, offset);
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
		result.subarray = Z.Utils.arraySubarraySimple;
		result.buffer = result;
		result.byteLength = result.length;
		result.set = Z.Utils.setSimple;
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

	encodeBase64 : function (data) {
		var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = '', tmp_arr = [];
		if (!data) { return data; }

		do { // Pack three octets into four hexets.
		    o1 = data[i++];
		    o2 = data[i++];
		    o3 = data[i++];
		    bits = o1 << 16 | o2 << 8 | o3;
		    h1 = bits >> 18 & 0x3f;
		    h2 = bits >> 12 & 0x3f;
		    h3 = bits >> 6 & 0x3f;
		    h4 = bits & 0x3f;

		    // Use hexets to index into b64, and append result to encoded string.
		    tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
		} while (i < data.length);

		enc = tmp_arr.join('');
		var r = data.length % 3;
		return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
	},

	// Prototyping and property modifications are used only to ensure legacy browser support for needed
	// functionality and is otherwise avoided to limit potential conflicts during code integration or customization.
	// One instance is currently implemented: adding response array support to net requests if not present.
	validateResponseArrayFunctionality : function (tileSource, tileHandlerPathFull) {
		if ((tileSource == 'ZoomifyZIFFile'  || (tileSource == 'ZoomifyPFFFile' && tileHandlerPathFull === null)) && !Z.responseArraySupported && !Z.responseArrayPrototyped) {
			Z.Utils.defineObjectProperty(XMLHttpRequest.prototype, 'response', {
				get : function () { return new VBArray(this.responseBody).toArray(); }
			});
			Z.responseArrayPrototyped = true;
		}
	},

	defineObjectProperty : function (obj, name, def) {
		if (Z.definePropertySupported) {
			Object.defineProperty(obj, name, def);
		} else {
			// DEV NOTE: Verify value of optional implementation.
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
		var IMAGE_LOAD_TIMEOUT = parseFloat(this.getResource('DEFAULT_IMAGELOADTIMEOUT'));

		var timeoutFunc = function () {
			console.log(Z.Utils.getResource('ERROR_IMAGEREQUESTTIMEDOUT'));
			complete(false);

			// Debug option: Append source data to error message above: + ": " + src);
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
		timeout = window.setTimeout(timeoutFunc, IMAGE_LOAD_TIMEOUT);
		image.src = src;
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::: MISCELLANEOUS UTILITY FUNCTIONS :::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	getCurrentUTCDateAsString : function () {
		var date = new Date();
		var month = ((date.getUTCMonth() + 1 < 10) ? '0' : '') + (date.getUTCMonth() + 1);
		var day = ((date.getUTCDate() < 10) ? '0' : '') + date.getUTCDate();
		var hour = ((date.getUTCHours() < 10) ? '0' : '') + date.getUTCHours();
		var minute = ((date.getUTCMinutes() < 10) ? '0' : '') + date.getUTCMinutes();
		var second = ((date.getUTCSeconds() < 10) ? '0' : '') + date.getUTCSeconds();
		return date.getUTCFullYear() + month + day + hour + minute + second;
	},

	cacheProofPath : function (url) {
		// Uses time stamp plus counter to guarantee uniqueness. Implementation with only time stamp fails to produce unique value on some versions of some browsers, and appending Math.random() slower.
		// Apply to support setImage feature, non-caching implementations, and to avoid IE problem leading to correct image with wrong dimensions. (DEV NOTE: Formerly limited to Z.browser == Z.browsers.IE)
		// Note: currently applied to most XML calls prior to loadXML(), to image folder tile requests in function formatTilePathImageFolder.  NOT applied directly in loadXML function in Z.NetConnector because not
		// applied to all XML paths. Not applied to annotation XML where targetViewer.simplePath used to prevent modifications to provided path. Also not applied to JSON paths. Not applied in PFF requests due to server
		// parsing requirements. Applied to all ZIF byterange requests directly in Z.NetConnector. Further consolidation and broader application anticipated in future releases.
		url += '?t' + new Date().getTime().toString() + 'n' + Z.cacheProofCounter.toString();
		Z.cacheProofCounter += 1;
		return url;
	},

	easing : function (b, t, c, d, effect, smoothZoomEasing, smoothZoomOnOff) {
		// Key: b=beginning position, t=target position, c=current time or position, d=duration or distance total, calculated s = span.
		
		if (typeof smoothZoomEasing === 'undefined' || smoothZoomEasing === null) { smoothZoomEasing = parseInt(Z.Utils.getResource('DEFAULT_SMOOTHZOOMEASING'), 10); }
		if (typeof smoothZoom === 'undefined' || smoothZoom === null) { smoothZoom = (Z.Utils.getResource('DEFAULT_SMOOTHZOOM') != '0'); }
		if (typeof effect === 'undefined' || effect === null) { effect = smoothZoomEasing; }
		
		var retVal = t;
		if (smoothZoom && effect > 1) {
			switch (effect) {
				case 2 :
					// Quintic out.
					var s = t - b;
					c /= d;
					c--;
					retVal = s * (c * c * c * c * c + 1) + b;
					break;
				case 3 :
					// Exponential out, longer glide to stop.
					var s = t - b;
					retVal = s * ( -Math.pow( 2, -10 * c/d ) + 1 ) + b;
					break;
				case 4 :
					// Quintic in-out, long start and stop.
					var s = t - b;
					if ((c /= d / 2) < 1) {
						retVal = s / 2 * c * c * c * c * c + b;
					} else {
						retVal = s / 2 * ((c -= 2) * c * c * c * c + 2) + b;
					}
					break;
			}
		}

		return retVal;
	},

	functionCallWithDelay : function (functionToCall, delay) {
		var timer = window.setTimeout( functionToCall, delay);
	},

	nodeIsInViewer : function (vwrIntID, nodeToTest) {
		var isInViewer = false;
		var ancestor = nodeToTest;
		while (isInViewer == false) {
			if (ancestor) {
				if (ancestor.id) {
					if (ancestor.id == 'ViewerDisplay' + vwrIntID) {
						isInViewer = true;
					} else {
						ancestor = ancestor.parentNode;
					}
				} else {
					ancestor = ancestor.parentNode;
				}
			} else {
				break;
			}
		}
		return isInViewer;
	},

	// Limit total digits, not just decimal places like JavaScript toFixed function, but do not convert to string.
	roundToFixed : function (value, digits) {
		var digitsBeforeDec = Math.round(value).toString().length;
		var digitsAfterDec = digits - digitsBeforeDec;
		var targetDigits = (digitsAfterDec < 0) ? 0 : digitsAfterDec;
		var roundFactor = Math.pow(10, targetDigits);
		value = Math.round(value * roundFactor) / roundFactor;
		return value;
	},

	// Returns pseudo-random integer between min and max.
	getRandomInt : function (min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},

	getSign : function (x) {
		return x ? x < 0 ? -1 : 1 : 0;
	}
};