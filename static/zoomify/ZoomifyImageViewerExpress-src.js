/**::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
@license Zoomify Image Viewer, version on line 25 below. Copyright Zoomify, Inc., 1999-2018. All rights reserved. You may
use this file on private and public websites, for personal and commercial purposes, with or without modifications, so long as this
notice is included. Redistribution via other means is not permitted without prior permission. Additional terms apply. For complete
license terms please see the Zoomify License Agreement in this product and on the Zoomify website at www.zoomify.com.
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
*/

/*
The functions below are listed in groups in the following order: Initialization, ZoomifyImageViewer,
ZoomifyViewport, ZoomifyToolbar, ZoomifyNavigator, ZoomifyGallery, ZoomifyRuler, ZoomifyNarrative, 
NetConnector, and Utils.  Within each group the functions appear in the order in which they are first 
called. Each group serves as a component with its own global variables and functions for sizing, positioning, 
and interaction. Shared variables global at the scope of the Zoomify Image Viewer are declared in a 
single 'Z' object which provides easy access while preventing naming conflicts with other code sources.
*/

(function () {
	// Declare global-to-page object to contain global-to-viewer elements.
	var global = (function () { return this; } ).call();
	global.Z = {};
})();

// Debug value: Display in browser console or use function Z.Viewer.getVersion(); to get value.
Z.version = '5.23.5 Express';

// Debug options:
// Enable trapping of errors in Safari on Windows: window.onerror = function (error) { alert(error); };
// Identify codeflow without callstack in debugger: console.log(arguments.callee.caller.name); or console.log(arguments.callee.caller.toString());
// Display code processing in debugger: debugger;

// Setting of callbacks and permission function implemented as function of Z global object for early and global support.
Z.setCallback = function (callbackName, callbackFunction) {
	if (typeof Z.callbacks === 'undefined') { Z.callbacks = []; }
	var index = Z.Utils.arrayIndexOfObjectTwoValues(Z.callbacks, 'callbackName', callbackName, null, 'callbackFunction', callbackFunction);
	if (index == -1) { index = Z.callbacks.length; }
	Z.callbacks[index] = { callbackName:callbackName, callbackFunction:callbackFunction };
}



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::: INIT FUNCTIONS ::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.showImage = function (containerID, imagePath, optionalParams) {
	if (!Z.showImage.done) {
		// Ensure full initialization occurs only on first call to showImage.
		Z.showImage.done = true;

		// Ensure needed browser functions exist.
		Z.Utils.addCrossBrowserMethods();
		Z.Utils.addCrossBrowserEvents();

		// Declare all global variables in one global object and get web page parameters.
		Z.Utils.declareGlobals();
		Z.pageContainerID = containerID;

		// Debug options:
		//Z.setCallback('viewUpdateComplete', function () { console.log('View update complete!'); } );
		//Z.setCallback('labelCreatedGetInternalID', function () { console.log('Label created!'); } );

		Z.setEditPermissionFunction = function (permissionFunction) {
			Z.externalEditPermissionFunction = permissionFunction;
			// Debug option: Z.setEditPermissionFunction(function () { return true; } );
			// Debug option: Z.setEditPermissionFunction(function () { return false; } );
			// Debub option: Z.setEditPermissionFunction(function () { console.log('asking'); } );
		}

		Z.clearCallback = function (callbackName, callbackFunction) {
			var index = Z.Utils.arrayIndexOfObjectTwoValues(Z.callbacks, 'callbackName', callbackName, null, 'callbackFunction', callbackFunction);
			if (index != -1) {
				Z.callbacks = Z.Utils.arraySplice(Z.callbacks, index, 1);
			}
		}

		// Prepare image path, or, if optional XML parameters path is set using image path parameter, prepare to parse XML for image path and any optional parameters.
		var imagePathProvided = (typeof imagePath !== 'undefined' && Z.Utils.stringValidate(imagePath));
		var optionalParamsIncludeIIIFServer = (typeof optionalParams !== 'undefined')
			&& ((typeof optionalParams === 'string' && optionalParams.indexOf('zIIIFServer') != -1)
				|| (typeof optionalParams === 'object' && typeof optionalParams['zIIIFServer'] !== 'undefined'));
		if (imagePathProvided && imagePath.indexOf('zXMLParametersPath') != -1) {
			var xmlParamsPath = imagePath.substring(19, imagePath.length);
			Z.xmlParametersPath = Z.Utils.stringRemoveTrailingSlash(xmlParamsPath);
		} else if (optionalParamsIncludeIIIFServer) {
			Z.imagePath = 'IIIFImageServer';
		} else if (imagePathProvided) {
			Z.imagePath = Z.Utils.stringRemoveTrailingSlash(imagePath);
		} else {
			Z.imagePath = null;
		}

		// Process optional parameters.
		if (typeof optionalParams !== 'undefined') {
			if (typeof optionalParams === 'string') {
				// For optional parameters passed as strings, various escaping alternatives handled here for '&' concatenation delimiter:
				// \u0026 handled by browser, %26 handled by unescape (deprecated), &#38; and &#038; and &amp; handled by function stringUnescapeAmpersandCharacters.
				var optionalParamsUnescaped = unescape(optionalParams);
				var optionalParamsFullyUnescaped = Z.Utils.stringUnescapeAmpersandCharacters(optionalParamsUnescaped);
				Z.parameters = Z.Utils.parseParameters(optionalParamsFullyUnescaped);
			} else {
				// For optional parameters passed as objects, above escape handling not required.
				Z.parameters = Z.Utils.parseParameters(optionalParams);
			}

			// Debug options:
			// console.log('optionalParamsRaw: ' + optionalParams);
			// console.log('optionalParamsUnescaped: ' + optionalParamsUnescaped);
			// console.log('optionalParamsFullyUnescaped: ' + optionalParamsFullyUnescaped);
			// console.log('Z.parameters: ' + Z.parameters);
		}

		// Initialize on content load rather than full page load if supported by browser.
		// If showImage called by user interaction after page is loaded, call initialize() directly.
		if (document.readyState != 'complete') {
			Z.Utils.addEventListener(document, 'DOMContentLoaded', Z.initialize);
			Z.Utils.addEventListener(window, 'load', Z.initialize);
		} else {
			Z.initialize();
		}

	} else {
		// Re-declare all global variables to clear, and re-get web page parameters.
		Z.Utils.declareGlobals();
		Z.pageContainerID = containerID;
		if (typeof imagePath !== 'undefined' && Z.Utils.stringValidate(imagePath)) {
			Z.imagePath = Z.Utils.stringRemoveTrailingSlash(imagePath);
		} else {
			Z.imagePath = null;
		}

		if (typeof optionalParams !== 'undefined') { Z.parameters = Z.Utils.parseParameters(optionalParams); }

		// Re-initialize to apply new parameters.
		Z.initialize();
	}
};

Z.initialize = function () {	
	// Ensure showImage called only once during page load.
	Z.Utils.removeEventListener(document, 'DOMContentLoaded', Z.initialize);
	Z.Utils.removeEventListener(window, 'load', Z.initialize);

	// Get browser features and either configure Viewer or set callback on setting of local image path.
	Z.Utils.detectBrowserFeatures();
	Z.pageContainer = document.getElementById(Z.pageContainerID);
	// Parse web page parameters and create Zoomify Viewer.
	if (Z.xmlParametersPath && !Z.parameters) {
		// Image path contains parameters XML path. The function loadParametersXML calls loadXML and sets receiveResponse to call parseParametersXML which re-calls this initialize function.
		Z.loadParametersXML();

	} else if (Z.parameters !== null && typeof Z.parameters['zXMLParametersPath'] !== 'undefined') {
		// Image path used but third parameter is meta-parameter that substitutes XML parameter file for HTML parameters.
		// In this case call to setParameters in next line calls loadParametersXML which calls loadXML and sets receiveResponse to call parseParametersXML which re-calls this initialize function.
		Z.Utils.setParameters(Z.parameters);

	} else { // Image path used. No parameters XML file.
		Z.Utils.setParameters(Z.parameters);
		if (!Z.localUse || !(Z.tileSource == 'ZoomifyZIFFile' || Z.tileSource == 'ZoomifyPFFFile')) {
			Z.createViewer();
		}

		// If in any debug mode, present basic debugging features (trace panel, globals dialog).
		if (Z.debug == 1 || Z.debug == 2 || Z.debug == 3) { Z.Utils.trace(Z.Utils.getResource('UI_TRACEDISPLAYDEBUGINFOTEXT'), false, true); }

	}
};

Z.createViewer = function () {	
	Z.Viewer = new Z.ZoomifyImageViewer();
	Z.Viewer.configureViewer();
}


// Support parameters in XML file rather than as HTML string.
Z.loadParametersXML = function () {
	Z.xmlParametersParsing = true;
	var netConnector = new Z.NetConnector();
	var XMLPath = Z.Utils.cacheProofPath(Z.xmlParametersPath);
	netConnector.loadXML(XMLPath, null, 'loadingParametersXML');
}



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::: VIEWER FUNCTIONS ::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.ZoomifyImageViewer = function () {
	var self = this;
	var viewerStatus = [];

	// Create Viewer display area as application environment for Viewport, Toolbar and Navigator.
	Z.ViewerDisplay = Z.Utils.createContainerElement('div', 'ViewerDisplay', 'inline-block', 'relative', 'hidden', '100%', '100%', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal', 'pointer');
	Z.pageContainer = document.getElementById(Z.pageContainerID);
	var containerS = Z.Utils.getElementStyle(Z.pageContainer);

	// Prevent selection of elements within Viewer, not including annotation panel text.
	Z.ViewerDisplay.style['-webkit-touch-callout'] = 'none';
	Z.ViewerDisplay.style['-moz-user-select'] = 'none';
	//Z.ViewerDisplay.style['-moz-user-select'] = '-moz-none'; // Pre Firefox v31
	Z.ViewerDisplay.style['-khtml-user-select'] = 'none';
	Z.ViewerDisplay.style['-webkit-user-select'] = 'none';
	Z.ViewerDisplay.style['-ms-user-select'] = 'none';
	Z.ViewerDisplay.style['-o-user-select'] = 'none';
	Z.ViewerDisplay.style['user-select'] = 'none';

	// Get container dimensions. Handle standard size values, percents, non-numerics, and non-standard percents.
	var containerDims = Z.Utils.getContainerSize(Z.pageContainer, Z.ViewerDisplay);
	Z.viewerW = containerDims.x;
	Z.viewerH = containerDims.y;

	// Clear container and append Viewer.
	Z.pageContainer.innerHTML = '';
	Z.pageContainer.appendChild(Z.ViewerDisplay);

	// Set global value to allow function initializeViewerEventListeners to enable responsive sizing if not disabled by HTML parameter zAutoResize=0 and if enabled by % container dimensions.
	Z.autoResize = (Z.autoResize || Z.Utils.isElementFluid(Z.pageContainer));
	var autoResizeSkipDuration = parseInt(Z.Utils.getResource('DEFAULT_AUTORESIZESKIPDURATION'), 10);
	var autoResizeSkipTimer;

	// Set viewer variable for mousewheel support.
	Z.mouseWheelCompleteDuration = parseInt(Z.Utils.getResource('DEFAULT_MOUSEWHEELCOMPLETEDURATION'), 10);

	// Set viewer variables for virtual pointer.
	if (Z.virtualPointerVisible) { var virtualPointer, virtualPointerImage; }

	// If viewing imageSet declare variables global to Viewer.
	if (Z.imageSet) { var imageSetObjects = [], imageSetList = null, imageSetListDP = []; }

	// Create Viewport or load imageSet XML to determine how many Viewports to create.
	this.configureViewer = function () {
		if (!Z.Viewer.getStatus('configureCalled')) {
			Z.Viewer.setStatus('configureCalled', true);
			
			// Set configuration functions to execute on initialization of only Viewport or last Viewport.
			function initCallbackFunction () {
				Z.clearCallback(initCallback, initCallbackFunction);
				initializeViewerEventListeners();

				// Use top viewport if multiple but do not use current pointer for overlays because it changes on interaction.
				var topVP = Z['Viewport' + (Z.imageSetLength - 1).toString()];
				var vpControl = (Z.overlays) ? topVP : Z.viewportCurrent;
				self.configureComponents(vpControl);
			}
			var initCallback = (!Z.imageSet) ? 'initializedViewport' : 'initializedViewer';
			Z.setCallback(initCallback, initCallbackFunction);
			
			// Set message clearing callback to execute on drawing complete of only Viewport or last Viewport.
			function viewerReadyCallbackFunction () {
				Z.clearCallback('readyViewer', viewerReadyCallbackFunction);
				if (Z.Utils.getMessage() == Z.Utils.getResource('ALERT_LOADINGIMAGESET') || Z.Utils.getMessage() == Z.Utils.getResource('ALERT_LOADINGANNOTATIONS')) {
					Z.Utils.hideMessage();
				}
				// Finish precaching of backfile tiles if delayed for faster image set start.
				if (Z.imageSet && !Z.comparison) { precacheBackfillTilesDelayed(); }

				// Alternative implementation: Finish precaching here for slidestacks but in function viewportSelect for animations.
				//if (Z.slidestack) { precacheBackfillTilesDelayed(); }
			}
			
			Z.setCallback('readyViewer', viewerReadyCallbackFunction);

			if (!Z.imageSet) {
				Z.Viewport = new Z.ZoomifyViewport(); // Enable references in all other functions that are modified for ImageSet support
				Z.viewportCurrent = Z.Viewport;
			}
		}
	}

	// Clear components being set with new parameters. Navigator, Toolbar, and Gallery parameters 
	// have a common root. Clearing custom help is not necessary because content is simply reloaded. 
	// Toolbar parameters include some with a common root but many without.
	this.validateComponents = function (viewport) {
		if (typeof Z.parameters !== 'undefined' && Z.parameters !== null) {
			var newParams = Object.keys(Z.parameters).toString();
			Z.Utils.clearComponent(Z.Navigator);
			Z.Utils.clearComponent(Z.Toolbar);
		}
	}

	// Create Toolbar, Navigator, and Ruler
	this.configureComponents = function (viewport) {
		if (Z.toolbarVisible > 0 && !Z.Toolbar) { Z.Toolbar = new Z.ZoomifyToolbar(viewport); }
		if (Z.navigatorVisible > 0) {
			if (!Z.Navigator) { Z.Navigator = new Z.ZoomifyNavigator(viewport); }
			if (Z.Navigator) { Z.Navigator.validateNavigatorGlobals(); }
			if (Z.comparison && !Z.Navigator2) { Z.Navigator2 = new Z.ZoomifyNavigator(Z.Viewport1); }
			if (Z.Navigator2) { Z.Navigator2.validateNavigatorGlobals(); }
		}
		if (Z.galleryVisible > 0) {
			if (!Z.Gallery) { Z.Gallery = new Z.ZoomifyGallery(viewport); }
			if (Z.Gallery) { Z.Gallery.validateGalleryGlobals(); }
		}
		if (Z.rulerVisible > 0 && !Z.Ruler) { Z.Ruler = new Z.ZoomifyRuler(viewport); }
		if (Z.helpCustom) { loadHelp(); }
	}

	this.loadHelp = function (helpPath, helpType) {
		loadHelp(helpPath, helpType);
	}

	function loadHelp (helpPath, helpType) {
		if (typeof helpPath === 'undefined' || !Z.Utils.stringValidate(helpPath)) { helpPath = Z.helpPath; }
		if (typeof helpType === 'undefined' || !Z.Utils.stringValidate(helpType)) { helpType = 'helpCustom'; }
		var netConnector = new Z.NetConnector();
		netConnector.loadHTML(helpPath, self.receiveHelpHTML, null, 'loadingHelpHTML-' + helpType);
	}

	this.receiveHelpHTML = function (xhr) {
		if (xhr.readyState == 4 && xhr.status == 200 && Z.Utils.stringValidate(xhr.responseText)) {
			if (xhr.zType) {
				if (xhr.zType.indexOf('helpCustom') != -1) {
					Z.helpContent = xhr.responseText;
					Z.Utils.validateCallback('helpLoadedCustom');
				} else if (xhr.zType.indexOf('helpNarrative') != -1) {
					Z.narrativeHelpContent = xhr.responseText;
					Z.Utils.validateCallback('helpLoadedNarrative');
				}
			}
		}
	}

	this.getVersion = function () {
		return Z.version;
	}

	this.setSizeAndPosition = function (width, height, left, top, update) {
		Z.viewerW = width;
		Z.viewerH = height;
		Z.ViewerDisplay.style.width = width + 'px';
		Z.ViewerDisplay.style.height = height + 'px';
		if (Z.Viewport && Z.Viewport.getStatus('initializedViewport')) {
			Z.Viewport.setSizeAndPosition(width, height, 0, 0);
		}
		
		var toolbarTopAdj = (!Z.toolbarBackgroundVisible) ? parseInt(Z.Utils.getResource('DEFAULT_TOOLBARBACKGROUNDVISIBLEADJUST'), 10) : 0;
		var toolbarTop = (Z.toolbarPosition == 1) ? height - Z.toolbarH - toolbarTopAdj : 0 + toolbarTopAdj;
		
		if (Z.Toolbar && Z.ToolbarDisplay && Z.Toolbar.getInitialized()) {
			Z.Toolbar.setSizeAndPosition(width, null, null, toolbarTop);
			if (Z.toolbarVisible != 0 && Z.toolbarVisible != 8) { Z.Toolbar.show(true); }
		}
		if (Z.Navigator && Z.Navigator.getInitialized()) {
			var navLeft = (Z.navigatorL == 0) ? left: (Z.navigatorL + Z.navigatorW > width) ? width - Z.navigatorW : Z.navigatorL;
			var navTop = (Z.navigatorT != 0) ? Z.navigatorT : top;
			Z.Navigator.setSizeAndPosition(null, null, navLeft, navTop, Z.navigatorFit);
			if (Z.navigatorVisible > 1) {
				Z.Navigator.setVisibility(true);
				if (Z.narrative) {
					left = width + Z.navigatorW;
				} else if (Z.comparison && Z.Navigator2) {
					var left2 = width - Z.navigatorW;
					Z.Navigator2.setSizeAndPosition(null, null, left2, top, Z.navigatorFit);
					Z.Navigator2.setVisibility(true);
				}
			}
		}
		if (virtualPointer) { virtualPointerAutoReposition(); }
		if (Z.imageList && Z.Viewport.getStatus('initializedImageList')) {
			Z.Viewport.setSizeAndPositionImageList();
		}
		if (Z.annotationFileList && Z.Viewport.getStatus('initializedAnnotationFileList')) {
			Z.Viewport.setSizeAndPositionAnnotationFileList();
		}
		if (Z.slideList && typeof slideList !== 'undefined' && slideList !== null) {
			var listCoords = Z.Viewport.calculateSlideListCoords(Z.viewerW, Z.viewerH); // viewH allows for toolbar height if static in viewer display area.
			slideList.style.left = listCoords.x + 'px';
			slideList.style.top = listCoords.y + 'px';
		}
		if (Z.Gallery && Z.Gallery.getInitialized()) {
			Z.Gallery.setSizeAndPosition(width, height, left, top);
			if (Z.galleryAutoShowHide) { Z.Gallery.setVisibility(true); }
		}
		if (Z.magnifierVisible > 0 && self.getStatus('magnifierInitializedViewport')) {
			self.sizeAndPositionMagnifier(null, null, null, null);
		}

		if (update) { Z.Viewport.updateView(true); }
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::: PATH FUNCTIONS :::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.getImagePath = function () {
		return self.getImage();
	}

	this.getImage = function () {
		return Z.imagePath;
	}

	// This function included for backward compatibility with version 1.
	this.setImagePath = function (imagePath, imageProperties) {
		if (typeof imageProperties !== 'undefined' && Z.Utils.stringValidate(imageProperties)) {
			Z.imageProperties = imageProperties;
		}
		self.setImage(imagePath);
	}

	// Use setImage to set image path as well as any image-specific optional parameters, and any non-image-specific
	// optional parameter including viewport, toolbar, navigator, tour, slide, hotspot, annotation, or other parameters.
	// Use showImage to force a full viewer reinitialization including all related components: toolbar, navigator, etc.
	this.setImage = function (imagePath, optionalParams, initializingCall, vpID) {
		if (Z.narrative && Z.imagePath === null) {
			Z.imagePath = Z.Utils.stringRemoveTrailingSlash(imagePath);
			Z.Utils.validateImagePath();
		}

		if (Z.Viewport && (Z.Viewport.getStatus('initializedViewport') || initializingCall)) {
			Z.Viewport.zoomAndPanAllStop(true);
			var proceed = true;
			if (Z.editing !== null) { proceed = validateExitCustom(); }
			if (proceed) {
				// Clear mask and image-specific optional parameters.
				if (Z.maskingSelection) { self.clearMask(); }
				if (!Z.overlays) { Z.Utils.clearImageParameters(); }

				// Clearing here unnecessary because occurs in function reinitializeViewport.
				//Z.Viewport.clearAll(true, true, true, true);

				// Reset image path.
				Z.imagePath = Z.Utils.stringRemoveTrailingSlash(imagePath);
				Z.Utils.validateImagePath();

				var targetViewport;
				if (typeof vpID === 'undefined' || vpID === null || vpID == 0) {
					targetViewport = Z.Viewport;
				} else {
					targetViewport = Z['Viewport' + vpID.toString()];
				}

				targetViewport.setImagePath(Z.imagePath);
				if (typeof optionalParams !== 'undefined' && optionalParams !== null) { Z.parameters = Z.Utils.parseParameters(optionalParams); }
					
				// If initializing, set parameters, otherwise, handled in function reinitializeViewport.
				if (initializingCall || Z.narrative) { Z.Utils.setParameters(Z.parameters); }
				
				if (Z.tileSource == 'unconverted') {
					targetViewport.loadUnconvertedImage(imagePath);
				} else if (!Z.imageProperties) {
					var netConnector = new Z.NetConnector();
					targetViewport.loadImageProperties(Z.imagePath, netConnector, vpID);
				} else {
					var xmlDoc = Z.Utils.xmlConvertTextToDoc(Z.imageProperties);
					targetViewport.parseImageXML(xmlDoc);
				}
			}

		} else {
			// If no viewport, create, and existing Viewer initilization callback will create components.
			var annotParam = (optionalParams) ? optionalParams.substring(optionalParams.indexOf('zAnnotationPath=') + 16, optionalParams.length) : null;
			Z.Viewport = new Z.ZoomifyViewport(0, imagePath, annotParam);
			Z.viewportCurrent = Z.Viewport;
			if (Z.Toolbar) { Z.Toolbar.setViewport(Z.viewportCurrent); }
		}
	}

	this.setImageWithFade = function (imagePath, optionalParams, initializingCall, changeFor) {
		if (Z.Viewport && (Z.Viewport.getStatus('initializedViewport') || initializingCall)) {
			if (typeof changeFor === 'undefined' || changeFor === null) { changeFor = 50; }
			Z.slideTransitionTimeout = window.setTimeout( function () { Z.Viewport.slideTransitionTimeoutHandler('out', imagePath, optionalParams, initializingCall); }, 1);
		}
	}

	this.initializePageExitEventHandler = function () {
		Z.Utils.addEventListener(window, 'beforeunload', validateExitBrowser);
	}

	this.disablePageExitEventHandler = function () {
		Z.Utils.removeEventListener(window, 'beforeunload', validateExitBrowser);
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: GET & SET FUNCTIONS :::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.getStatus = function (vState) {
		var index = Z.Utils.arrayIndexOfObjectValue(viewerStatus, 'state', vState);
		var statusVal = (index == -1) ? false : viewerStatus[index].status;
		return statusVal;
	}

	this.setStatus = function (vState, vStatus) {
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
			Z.Utils.validateCallback(vState);
			self.validateViewerReady(vState);
		}
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::: VALIDATION FUNCTIONS :::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	this.validateViewerStatus = function (vState) {
		var statusVal = true;
		if (Z.imageSet) {
			for (var i = 0, j = Z.imageSetLength; i < j; i++) {
				var vpTest = Z['Viewport' + i.toString()];
				if (!vpTest.getStatus(vState)) {
					statusVal = false;
					break;
				}
			}
		}
		if (statusVal) {
			var indexVP = vState.indexOf('Viewport');
			if (indexVP != -1) { vState = vState.substring(0, indexVP); }
			self.setStatus(vState + 'Viewer', true);
		}
	}

	this.validateViewerReady = function (vState) {
		var viewportOK = (Z.Viewport && Z.Viewport.getStatus('initializedViewport') && (Z.tileSource == 'unconverted' || (Z.Viewport.getStatus('precacheLoadedViewport') && Z.Viewport.getStatus('backfillLoadedViewport') && Z.Viewport.getStatus('backfillDrawnViewport'))) && Z.Viewport.getStatus('displayLoadedViewport') && Z.Viewport.getStatus('displayDrawnViewport'));
		var hotspotsOK = (!Z.hotspots || (Z.Viewport && Z.Viewport.getStatus('hotspotsLoadedViewport')));
		var annotationsOK = (!Z.annotations || (Z.Viewport && Z.Viewport.getStatus('annotationsLoadedViewport') && (!Z.annotationPanelVisible || Z.Viewport.getStatus('annotationPanelInitializedViewport'))));
		var toolbarOK = (Z.toolbarVisible == 0 || (Z.Toolbar && Z.Toolbar.getInitialized()));
		var navigatorOK = (!Z.navigatorVisible || (Z.Navigator && Z.Navigator.getInitialized()));
		var galleryOK = (!Z.galleryVisible || (Z.Gallery && Z.Gallery.getInitialized()));
		var rulerOK = (!Z.rulerVisible || (Z.Ruler && Z.Ruler.getInitialized()));
		var imageSetOK = (!Z.imageSet || (Z.Viewer && Z.Viewer.getStatus('initializedViewer') && (Z.tileSource == 'unconverted' || (Z.Viewer.getStatus('precacheLoadedViewer')  && Z.Viewer.getStatus('backfillLoadedViewer') && Z.Viewer.getStatus('backfillDrawnViewer'))) && Z.Viewer.getStatus('displayLoadedViewer') && Z.Viewer.getStatus('displayDrawnViewer')));
		var imageSetHotspotsOK = (!Z.imageSet || !Z.hotspots || (Z.Viewer && Z.Viewer.getStatus('hotspotsLoadedViewer')));
		var imageSetAnnotationsOK = (!Z.imageSet || !Z.annotations || (Z.Viewer && Z.Viewer.getStatus('annotationsLoadedViewer') && (!Z.annotationPanelVisible || Z.Viewer.getStatus('annotationPanelInitializedViewer'))));
		var viewerReady = viewportOK && hotspotsOK && annotationsOK && toolbarOK && navigatorOK && galleryOK && rulerOK && imageSetOK && imageSetHotspotsOK && imageSetAnnotationsOK;

		// Debug options:
		//console.log('In validateViewerReady - state: ' + vState + '   viewerReady: ' + viewerReady + '    values: ' + viewportOK + '  ' + hotspotsOK + '  ' + annotationsOK + '  ' + toolbarOK + '  ' + navigatorOK + '  ' + galleryOK + '  ' + rulerOK + '  ' + imageSetOK + '  ' + imageSetHotspotsOK + '  ' + imageSetAnnotationsOK);
		//if (Z.Viewport) { console.log(Z.Viewport.getStatus('backfillLoadedViewport'), Z.Viewport.getStatus('displayLoadedViewport'), Z.Viewport.getStatus('backfillDrawnViewport'), Z.Viewport.getStatus('displayDrawnViewport')); }

		if (viewerReady) { Z.Viewer.setStatus('readyViewer', true); }
		return viewerReady;
	}

	function validateExitBrowser (event) {
		var event = Z.Utils.event(event);
		if (event) {
			var confirmationMessage = null;
			if (Z.editing !== null && Z.Viewport.verifyEditsUnsaved()) {
				confirmationMessage = Z.Utils.getResource('ALERT_UNSAVEDEDITSEXIST-BROWSER');
				event.returnValue = confirmationMessage;
				return confirmationMessage;
			}
		}
	}

	function validateExitCustom () {
		var endEditing = true;
		if (Z.editing !== null && Z.Viewport.verifyEditsUnsaved()) {
			endEditing = confirm(Z.Utils.getResource('ALERT_UNSAVEDEDITSEXIST-CUSTOM'));
		}
		return endEditing;
	}
	
	

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::: EVENT FUNCTIONS ::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Handle keyboard, mouse, mousewheel, and touch events that are not Viewport-specific.
	// Mousewheel handler added here plus DOMMouseScroll added in addEventListener function.
	function initializeViewerEventListeners () {
		self.initializeViewerKeyEventListeners(true);
		Z.Utils.addEventListener(Z.ViewerDisplay, 'mouseover', viewerEventsHandler);
		Z.Utils.addEventListener(Z.ViewerDisplay, 'mouseout', viewerEventsHandler);
		Z.Utils.addEventListener(Z.ViewerDisplay, 'mousemove', Z.Utils.preventDefault);
		Z.Utils.addEventListener(Z.ViewerDisplay, 'mousewheel', viewerEventsHandler);

		// If mousewheel enabled for zoom or image set navigation, block default mousewheel page scrolling.
		if (Z.mouseWheel > 0) { Z.Utils.addEventListener(Z.ViewerDisplay, 'mousewheel', Z.Utils.preventDefault); }

		initializeOrientationChangeHandler();
		if (Z.autoResize) { Z.Utils.addEventListener(window, 'resize', Z.Viewer.viewerEventsHandler); }

		// If tracking, prevent arrow keys from scrolling page because arrow keys are used for guided navigation by cell increments.
		if (Z.tracking) { Z.Viewer.initializeViewerKeyDefaultListeners(true); }

		// DEV NOTE: The following line prevents click-drag out of Viewer from selecting external text
		// in Safari, however, it disables all lists (hotspot, tour, slide, label). Working on alternative.
		// Z.Utils.addEventListener(Z.ViewerDisplay, 'mousedown', Z.Utils.preventDefault);
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
		if (!Z.interactive) { return; }
		if (Z.fullView) {
			if (Z.Toolbar) {
				if (Z.toolbarAutoShowHide) { Z.Toolbar.show(false); }
			}
			if (Z.Navigator && Z.navigatorVisible > 1) {
				Z.Navigator.setVisibility(false);
			}
			if (Z.Viewport) {
				Z.Viewport.toggleFullViewMode(false);
				Z.Viewport.toggleFullViewMode(true);
			}
			if (Z.Navigator && Z.navigatorVisible > 1) {
				Z.Navigator.setVisibility(true);
			}
			if (Z.Toolbar) {
				if (Z.toolbarAutoShowHide) { Z.Toolbar.show(true); }
			}
		}
	}

	this.initializeViewerKeyEventListeners = function (enable) {
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
		if (!Z.interactive || !Z.keys || document.activeElement.tagName == 'INPUT' || document.activeElement.tagName == 'TEXTAREA') {
			return;
		}

		var event = Z.Utils.event(event);
		var isAltKey = event.altKey;

		// Prevent conflicting zoom-and-pan function calls. Must not react to alt key release
		// in order to support alt-click zoom-to-100 and alt-dbl-click zoom-to-zoom-to-fit features.
		if (event.keyCode != 18 && !event.altKey) {
			Z.viewportCurrent.zoomAndPanAllStop(true, true);
			if (Z.maskingSelection) { Z.viewportCurrent.clearMask(); }
		}

		// Handle key events.
		if (event) {
			var eventType = event.type;
			var kc = event.keyCode;
			if (eventType == 'keydown') {
				Z.keyIsDown = true;
				switch (kc) {
					case 90: // z
						Z.viewportCurrent.zoom('out');
						break;
					case 17: // control
						if (Z.platform != 'macintosh') { Z.viewportCurrent.zoom('out'); }
						break;
					case 65: // a
						Z.viewportCurrent.zoom('in');
						break;
					case 16: // shift
						if (Z.platform != 'macintosh') { Z.viewportCurrent.zoom('in'); }
						break;
					case 37: // left arrow
						if (!Z.tracking && !Z.animation || Z.viewportCurrent.getZoom() != Z.minZ) {
							Z.viewportCurrent.pan('left');
						} else if (Z.imageSet)  {
							self.viewportPrior();
						}
						break;
					case 38: // up arrow
						if (!Z.tracking && !Z.animation || Z.viewportCurrent.getZoom() != Z.minZ) {
							Z.viewportCurrent.pan('up');
						} else if (Z.imageSet)  {
							self.viewportNext();
						}
						break;
					case 40: // down arrow
						if (!Z.tracking && !Z.animation || Z.viewportCurrent.getZoom() != Z.minZ) {
							Z.viewportCurrent.pan('down');
						} else if (Z.imageSet) {
							self.viewportPrior();
						}
						break;
					case 39: // right arrow
						if (!Z.tracking && !Z.animation || Z.viewportCurrent.getZoom() != Z.minZ) {
							Z.viewportCurrent.pan('right');
						} else if (Z.imageSet) {
							self.viewportNext();
						}
						break;
					case 27: // escape
						if (!Z.fullView) {
							Z.viewportCurrent.reset();
						} else {
							Z.viewportCurrent.toggleFullViewMode(false);
						}
						break;
					case 190: // '>' ('.')
						if (Z.rotationVisible) { Z.viewportCurrent.rotate('clockwise', isAltKey); }
						break;
					case 188: // '<'  (',')
						if (Z.rotationVisible) { Z.viewportCurrent.rotate('counterwise', isAltKey); }
						break;

					case 33: // page up
						 if (Z.imageSet && !Z.overlays) { self.viewportNext(); }
						break;
					case 34: // page down
						 if (Z.imageSet && !Z.overlays) { self.viewportPrior(); }
						break;
					case 76: // 'L' (lower case)
						if (isAltKey && (Z.hotspots || Z.annotations)) { Z.viewportCurrent.setHotspotsVisibility(!Z.viewportCurrent.getHotspotsVisibility()); }
						break;
				}

				if (Z.imageSet && (kc == 33 || kc == 34)) {
					if (event.preventDefault) {
						event.preventDefault();
					} else {
						event.returnValue = false;
					}
				}

			} else if (eventType == 'keyup') {
				Z.keyIsDown = false;
				if (kc == 90 || kc == 17 || kc == 65 || kc == 16) {  // z, ctrl, a, and shift keys
					Z.viewportCurrent.zoom('stop');
				} else if (kc == 37 || kc == 39 || kc == 38 || kc == 40) {  // Arrow keys
					if (!Z.tracking) {
						if (kc == 37 || kc == 39) {
							Z.viewportCurrent.pan('horizontalStop');
						} else if (kc == 38 || kc == 40) {
							Z.viewportCurrent.pan('verticalStop');
						}
					} else {
						if (kc == 37) {
							Z.viewportCurrent.goToNextCell('left');
						} else if (kc == 39) {
							Z.viewportCurrent.goToNextCell('right');
						} else if (kc == 38) {
							Z.viewportCurrent.goToNextCell('up');
						} else if (kc == 40) {
							Z.viewportCurrent.goToNextCell('down');
						}
					}
				} else if (Z.rotationVisible && (kc == 190 || kc == 188)) {
					Z.viewportCurrent.rotate('stop');
				} else if (Z.imageSet && (kc == 33 || kc == 34)) { // page up and page down keys.
					if (Z.imageSet) { Z.viewportCurrent.updateView(true); }
					if (event.preventDefault) {
						event.preventDefault();
					} else {
						event.returnValue = false;
					}
				} else if (kc == 32) { // space bar
					if (Z.fullViewVisible || Z.fullScreenVisible || Z.fullPageVisible) {
						Z.viewportCurrent.toggleFullViewMode();						
					}
				} else if (kc == 46) { // delete key
					if (Z.editMode !== null && (Z.annotations || Z.tracking)) { Z.viewportCurrent.deleteCurrentLabel(); }
				}
			}
		}
	}

	this.initializeViewerKeyDefaultListeners = function (enable) {
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

			// Prevent unwanted effects: interactivity or mouse-panning if parameters specify, zoom on right-click, and page dragging in touch contexts.
			// DEV NOTE: Timeout in next line is placeholder workaround for hotspot graphic and caption anchor failure in IE.
			if ((eventType != 'mouseover' && eventType != 'mouseout' && !Z.interactive)
				|| (eventType == 'mousedown' && (!Z.interactive || (Z.coordinatesVisible && isAltKey)))
				|| isRightMouseBtn) { return; }
			if (Z.touchSupport && !Z.clickZoomAndPanBlock && eventType != 'touchmove' && eventType != 'gesturechange') {
				event.preventDefault();
			}

			// Handle event resetting.
			switch(eventType) {
				case 'mouseover' :
					// Prevent page scrolling using arrow keys. Also implemented in text element blur handler.
					if (!Z.fullView && document.activeElement.tagName != 'TEXTAREA' && document.activeElement.id !== 'narrativeTextBox') {
						Z.Viewer.initializeViewerKeyDefaultListeners(true);
					}
					break;
				case 'mouseout' :
					// If not tracking, disable prevention of page scrolling due to arrow keys. Also occurs in text element focus handler.
					if (!Z.tracking) { Z.Viewer.initializeViewerKeyDefaultListeners(false); }
					// Alternative implementation: Disable key interaction if mouse is not over viewer.
					//Z.Viewer.initializeViewerKeyEventListeners(false);
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
					var targetIsInViewer = Z.Utils.nodeIsInViewer(target);
					var relatedTargetIsInViewer = Z.Utils.nodeIsInViewer(relatedTarget);
					var listInteraction = (target == '[object HTMLSelectElement]' || target == '[object HTMLOptionElement]' || relatedTarget == '[object HTMLSelectElement]' || relatedTarget == '[object HTMLOptionElement]');
					// DEV NOTE: not currently required: var cursorIsInViewer = Z.Utils.pointIsInViewer(mPt);
					
					// Block if moving within viewer display or subelements.
					if (!(targetIsInViewer && relatedTargetIsInViewer) && !listInteraction) {

						// Mouse-over bubbles from navigator or toolbar blocked by stop propagation handlers. Mouse-overs not
						// needed on return from outside viewer as components would be hidden if toolbar mode enables hiding.
						if (Z.viewportCurrent && !(Z.narrative && !Z.narrativeMode)) { Z.viewportCurrent.showLists(true); }
						if (Z.ToolbarDisplay && Z.Toolbar && Z.toolbarAutoShowHide) { Z.Toolbar.show(true); }
						if (Z.Navigator && Z.navigatorVisible > 1) {
							Z.Navigator.setVisibility(true);
						}
						Z.mouseOutDownPoint = null;
					}
					break;

				case 'mouseout' :
					var targetIsInViewer = Z.Utils.nodeIsInViewer(target);
					var relatedTargetIsInViewer = Z.Utils.nodeIsInViewer(relatedTarget);
					var listInteraction = (target == '[object HTMLSelectElement]' || target == '[object HTMLOptionElement]' || relatedTarget == '[object HTMLSelectElement]' || relatedTarget == '[object HTMLOptionElement]');
					var cursorIsInViewer = Z.Utils.pointIsInViewer(mPt);
					
					// Block if moving within viewer display or subelements.
					if (!cursorIsInViewer && (!targetIsInViewer || !relatedTargetIsInViewer) && !listInteraction) {
					
						if (!Z.mouseIsDown) {
							if (Z.viewportCurrent) { Z.viewportCurrent.showLists(false); }
							if (Z.ToolbarDisplay && Z.Toolbar && Z.toolbarAutoShowHide) { Z.Toolbar.show(false); }
							if (Z.Navigator && Z.navigatorVisible > 1) {
								Z.Navigator.setVisibility(false);
							}
						} else {
							Z.mouseOutDownPoint = new Z.Utils.Point(mPt.x, mPt.y);
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
					if (Z.mouseWheel > 0) {
						var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
						Z.viewportCurrent.mouseWheelHandler(delta, isAltKey);
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
		if (!Z.fullScreenEntering) {
			//DEV NOTE: workaround for Chrome/IE issue with Z.viewerW & Z.viewerH not reset during autoresize.
			var elem = document.getElementById(Z.pageContainerID);
			Z.viewerW = elem.offsetWidth;
			Z.viewerH = elem.offsetHeight;
			var containerDims = Z.Utils.getContainerSize(Z.pageContainer, Z.ViewerDisplay);
			var newZoom = Z.viewportCurrent.calculateZoomForResize(Z.viewportCurrent.getZoom(), Z.viewerW, Z.viewerH, containerDims.x, containerDims.y);
			self.resizeViewer(containerDims.x, containerDims.y, newZoom);
		}
	}

	this.resizeViewer = function (w, h, z) {
		self.setSizeAndPosition(w, h, 0, 0, false);
		Z.viewportCurrent.resizeViewport(Z.imageX, Z.imageY, z, Z.imageR);
		if (Z.comparison) {
			var vpComparison = (Z.viewportCurrent.getViewportID() == 0) ? Z.Viewport1 : Z.Viewport0;
			if (vpComparison) { vpComparison.syncViewportResize(Z.imageX, Z.imageY, Z.imageZ, Z.imageR); }
		} else if (Z.overlays) {
			for (var i = 0, j = Z.imageSetLength - 1; i < j; i++) {
				// -1 in line above prevents top VP from resetting itself in loop.
				Z['Viewport' + i.toString()].syncViewportResize(Z.imageX, Z.imageY, Z.imageZ, Z.imageR);
			}
		} else if (Z.narrative) {
			Z.Narrative.drawLayoutNarrativePanel();
			if (Z.narrativeMode) { Z.Narrative.drawLayoutFileManagerPanel(); }
		}
	}

	this.mouseWheelCompleteHandler = function (event) {
		Z.mouseWheelIsDown = false;
		if (Z.mouseWheelCompleteTimer) {
			window.clearTimeout(Z.mouseWheelCompleteTimer);
			Z.mouseWheelCompleteTimer = null;
			Z.zooming = 'stop';
			Z.viewportCurrent.updateView(true);
		}
	}

	this.magnifierMouseMoveHandler = function (event) {
		if (!Z.interactive) { return; }
		Z.viewportCurrent.updateViewMagnifier(event);
	}
};



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::::::::::::::::::::::::::::::::: VIEWPORT FUNCTIONS ::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.ZoomifyViewport = function (vpID, vpImgPath, vpAnnotPath, vpHotPath, vpTrackPath, vpImageListPath) {
	// The following viewer global variables are limited to viewport scope when viewing an imageSet.
	// Z.imagePath, Z.hotspotPath, Z.hotspotFolder, Z.annotationPath, Z.annotationFolder, Z.tileSource, Z.imageW, Z.imageH, Z.imageX, Z.imageY, Z.imageZ, Z.initialX, Z.initialY, Z.initialZ, Z.minZ, Z.maxZ.
	var hotspotPath, hotspotFolder, annotationPath, annotationFolder;
	var imageX = null, imageY = null, imageZ = null;
	var timeoutCounterHotspotsVisibilityByFilter = 0, timeoutCounterHotspotsVisibilityAll = 0;

	var viewportID = 0;
	if (typeof vpID !== "undefined" && vpID !== null) { viewportID = vpID; }

	var imagePath;
	if (typeof vpImgPath !== "undefined" && vpImgPath !== null) {
		imagePath = vpImgPath;
	} else {
		imagePath = Z.imagePath;
	}

	// Z.hotspotPath and Z.hotspotFolder or Z.annotationPath and Z.annotationFolder and/or Z.trackingPath and Z.trackingFolder are set here if multiples for imageSet, otherwise set in setParameters.
	if (typeof vpHotPath === "undefined" || vpHotPath === null) {
		hotspotPath = Z.hotspotPath;
		hotspotFolder = Z.hotspotPath;
	} else {
		hotspotPath = vpHotPath;
		hotspotFolder = hotspotPath;
		if (hotspotFolder.toLowerCase().substring(hotspotFolder.length - 4, hotspotFolder.length) == ".xml") {
			hotspotFolder = hotspotFolder.substring(0, hotspotFolder.lastIndexOf("/"));
		}
	}

	if (typeof vpAnnotPath === "undefined" || vpAnnotPath === null) {
		annotationPath = Z.annotationPath;
		annotationFolder = Z.annotationFolder;
	} else {
		annotationPath = vpAnnotPath;
		annotationFolder = annotationPath;
		if (annotationFolder.toLowerCase().substring(annotationFolder.length - 4, annotationFolder.length) == ".xml") {
			annotationFolder = annotationFolder.substring(0, annotationFolder.lastIndexOf("/"));
		}
	}
	if (typeof vpTrackPath === "undefined" || vpTrackPath === null) {
		trackingPath = Z.trackingPath;
		trackingFolder = Z.trackingFolder;
	} else {
		trackingPath = vpTrackPath;
		trackingFolder = trackingPath;
		if (trackingFolder.toLowerCase().substring(trackingFolder.length - 4, trackingFolder.length) == ".xml") {
			trackingFolder = trackingFolder.substring(0, trackingFolder.lastIndexOf("/"));
		}
	}
	if (typeof vpImageListPath === "undefined" || vpImageListPath === null) {
		imageListPath = Z.imageListPath;
		imageListFolder = Z.imageListFolder;
	} else {
		imageListPath = vpImageListPath;
		imageListFolder = imageListPath;
		if (imageListFolder.toLowerCase().substring(imageListFolder.length - 4, imageListFolder.length) == ".xml") {
			imageListFolder = imageListFolder.substring(0, imageListFolder.lastIndexOf("/"));
		}
	}

	// Set Viewer globals that cause hotspot/annotation display to be created and annotations.xml file(s) is/are parsed and annotation panel is created.
	if (typeof hotspotPath !== 'undefined' && Z.Utils.stringValidate(hotspotPath)) {
		Z.hotspots = true;
		Z.annotationPathProvided = true;
		if (Z.imageSet) { Z.hotspotPath = 'multiple'; }
	} else if (typeof annotationPath !== 'undefined' && Z.Utils.stringValidate(annotationPath)) {
		Z.annotationPath = Z.Utils.stringRemoveTrailingSlash(annotationPath);
		Z.annotationFolder = Z.annotationPath;
		if (Z.annotationPath.toLowerCase().substring(Z.annotationPath.length - 4, Z.annotationPath.length) == '.xml') {
			Z.annotationFolder = Z.annotationFolder.substring(0, Z.annotationFolder.lastIndexOf('/'));
		}
		Z.annotations = true;
		Z.annotationPathProvided = true;

		if (Z.imageSet) { Z.annotationPath = 'multiple'; }
	}

	// Set Viewer globals that cause narrative display to be created.
	if (typeof Z.narrativePath !== 'undefined' && Z.Utils.stringValidate(Z.narrativePath)) {
		Z.narrative = true;
		Z.narrativePathProvided = true;
	}

	// Set Viewer globals that cause tracking display and/or image list to be created.
	if (typeof trackingPath !== 'undefined' && Z.Utils.stringValidate(trackingPath)) {
		Z.tracking = true;
		Z.trackingPathProvided = true;
	}
	if (typeof imageListPath !== 'undefined' && Z.Utils.stringValidate(imageListPath)) {
		Z.imageListPath = imageListPath;
		Z.imageList = true;
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::::: INIT FUNCTIONS ::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Declare variables for viewport internal self-reference and for initialization completion.
	var self = this;
	var viewportStatus = [];

	// Set viewport constants and static variables from value in Zoomify Image Folder 'ImageProperties.xml' file or Zoomify Image File (PFF) header.
	var IMAGE_VERSION = -1;
	var HEADER_SIZE = 0
	var HEADER_SIZE_TOTAL = 0;
	var CHUNK_SIZE = parseInt(Z.Utils.getResource('DEFAULT_CHUNKSIZE'), 10);
	var OFFSET_CHUNK_SIZE_BYTES = CHUNK_SIZE * 8;
	var BC_CHUNK_SIZE_BYTES = CHUNK_SIZE * 4;
	var TILE_COUNT = 0;
	var TILES_PER_FOLDER = 256;
	var TILE_WIDTH = parseInt(Z.Utils.getResource('DEFAULT_TILEW'), 10);
	var TILE_HEIGHT = parseInt(Z.Utils.getResource('DEFAULT_TILEH'), 10);

	// Set other defaults and calculate other constants.
	var TIERS_SCALE_UP_MAX = parseFloat(Z.Utils.getResource('DEFAULT_TIERSMAXSCALEUP'));
	var TIERS_SCALE_DOWN_MAX = TIERS_SCALE_UP_MAX / 2;
	var TILES_CACHE_MAX = parseInt(Z.Utils.getResource('DEFAULT_TILESMAXCACHE'), 10);
	var MOUSECLICK_THRESHOLD_VIEWPORT = parseInt(Z.Utils.getResource('DEFAULT_MOUSECLICKTHRESHOLDVIEWPORT'), 10);
	var MOUSECLICK_THRESHOLD_TIME_VIEWPORT = parseInt(Z.Utils.getResource('DEFAULT_MOUSECLICKTHRESHOLDTIMEVIEWPORT'), 10);
	var TOUCHTAP_THRESHOLD_VIEWPORT = parseInt(Z.Utils.getResource('DEFAULT_TOUCHTAPTHRESHOLDVIEWPORT'), 10);
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
	var tierCount = 1, tierCurrent = 0, tierBackfill = 0, maxTier, maxTileR, maxTileB;
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
	var tileNetConnector = new Z.NetConnector();
	
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
	var panBufferUnconverted = parseFloat(Z.Utils.getResource('DEFAULT_PANBUFFERUNCONVERTED'), 10);
	var panBufferStandard = (Z.panBuffer !== null) ? Z.panBuffer : parseFloat(Z.Utils.getResource('DEFAULT_PANBUFFER'), 10);
	var PAN_BUFFER = (Z.tileSource != 'unconverted') ? panBufferStandard : panBufferUnconverted;
	var BACKFILL_BUFFER = parseFloat(Z.Utils.getResource('DEFAULT_BACKFILLBUFFER'), 10);
	var PAN_BUFFERSIZEMAXBROWSER = parseFloat(Z.Utils.getResource('DEFAULT_PAN_BUFFERSIZEMAXBROWSER'), 10);
	var PAN_BUFFERSIZEMAXFIREFOX = parseFloat(Z.Utils.getResource('DEFAULT_PAN_BUFFERSIZEMAXFIREFOX'), 10);
	var PAN_BUFFERSIZEMAXMOBILE = parseFloat(Z.Utils.getResource('DEFAULT_PAN_BUFFERSIZEMAXMOBILE'), 10);
	var PAN_BUFFERSIZEMAXIMAGESET = parseFloat(Z.Utils.getResource('DEFAULT_PAN_BUFFERSIZEMAXIMAGESET'), 10);
	var viewW, viewH, viewL, viewT, viewCtrX, viewCtrY;
	var displayW, displayH, displayCtrX, displayCtrY, displayL, displayR, displayT, displayB;
	var backfillW, backfillH, backfillCtrX, backfillCtrY, backfillL, backfillT;

	// Set initial values for tile selection and caching areas and adjust if static visible toolbar.
	var tlbrOffset = (Z.toolbarVisible == 1 && Z.toolbarBackgroundVisible) ? (Z.toolbarH !== null) ? Z.toolbarH : parseInt(Z.Utils.getResource('DEFAULT_TOOLBARHEIGHT'), 10) : 0;
	viewW = Z.viewerW;
	viewH = Z.viewerH - tlbrOffset;
	viewL = 0;
	viewT = (Z.toolbarPosition == 0) ? tlbrOffset : 0;

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
	var panStepDistance = Math.round(parseFloat(Z.Utils.getResource('DEFAULT_PANSTEPDISTANCE')) * Z.panSpeed);
	var panX = 0, panY = 0, smoothAnimationX = null, smoothAnimationY = null;
	var optimalMotionImages = parseInt(Z.Utils.getResource('DEFAULT_ANIMATIONOPTIMALMOTIONIMAGES'), 10);
	var optimalPositionDelta = parseInt(Z.Utils.getResource('DEFAULT_ANIMATIONOPTIMALPOSITIONDELTA'), 10);
	var smoothPanInterval = null, smoothPanStartPt = null, smoothPanDisplayStartPt = null, smoothPanMousePt = null;
	var smoothPanDeltaX = 0, smoothPanDeltaY = 0, smoothPanLastDeltaX = 0, smoothPanLastDeltaY = 0;
	var smoothPanGliding = null, smoothPanGlideX = null, smoothPanGlideY = null;
	var zoomStepDistance = (parseFloat(Z.Utils.getResource('DEFAULT_ZOOMSTEPDISTANCE')) * Z.zoomSpeed);
	if (Z.mobileDevice) { zoomStepDistance /= 2; }
	var zoomVal = 0, zapTimer = null, zapStepCount = 0;
	var zapStepDuration = parseInt(Z.Utils.getResource('DEFAULT_ZAPSTEPDURATION'), 10);
	var zapTierCurrentZoomUnscaledX, zapTierCurrentZoomUnscaledY;
	var fadeInStep = (parseFloat(Z.Utils.getResource('DEFAULT_FADEINSTEP')) * Z.fadeInSpeed);
	var fadeInInterval = null;
	var rotStepDegrees = parseInt(Z.Utils.getResource('DEFAULT_ROTATIONSTEPDEGREES'), 10);
	var rotStepDuration = parseInt(Z.Utils.getResource('DEFAULT_ROTATIONSTEPDURATION'), 10);
	var rotVal = 0, rotTimer = null;

	// Declare viewport variables for zoom-and-pan-to-view functions.
	var zaptvDuration = parseFloat(Z.Utils.getResource('DEFAULT_ZAPTVDURATION'));
	var zaptvSteps = parseFloat(Z.Utils.getResource('DEFAULT_ZAPTVSTEPS'));
	if (Z.mobileDevice) { zaptvSteps /= 2; }
	var zaptvTimer = null, zaptvStepCurrent = 0;

	// If optional parameters set, declare variables for full view, virtual pointer, crosshairs, measurement, 
	// geo coordinates, image filters, watermarks, image lists, and annotation file list.
	if (!Z.fullScreenVisible && !Z.fullPageVisible) {
		var fvBodW, fvBodH, fvBodO, fvDocO, fvContBC, fvContW, fvContH, fvContPos, fvContIdx;
		var buttonFullViewExitExternal, buttonFullViewExitExternalVisible;
	}
	if (Z.crosshairsVisible) {
		Z.Utils.drawCrosshairs(Z.ViewerDisplay, viewW, viewH);
	}
	if (Z.measureVisible || Z.editMode !== null || Z.annotations) {
		var captionBackOpacity = parseFloat(Z.Utils.getResource('DEFAULT_CAPTIONBACKALPHA'));
		var measureLengthText = Z.Utils.getResource('UI_MEASURELENGTH');
		var measureLengthTotalText = Z.Utils.getResource('UI_MEASURELENGTHTOTAL');
		var measurePerimeterText = Z.Utils.getResource('UI_MEASUREPERIMETER');
		var measureAreaText = Z.Utils.getResource('UI_MEASUREAREA');
		var measureSquareText = Z.Utils.getResource('UI_MEASURESQUARE');
		var measureCaptionFontSize = parseInt(Z.Utils.getResource('DEFAULT_MEASURECAPTIONFONTSIZE'), 10);
		var captionW = parseInt(Z.Utils.getResource('DEFAULT_MEASURECAPTIONWIDTH'), 10);
	}
	if (Z.geoCoordinatesVisible) {
		var geoLeft, geoRight, geoTop, geoBottom;
		var geoLeftDec, geoTopDec, geoXSpan, geoYSpan;
	}
	if (Z.imageFilters) {
		var imageFilterTimer = null, imageFilterBackfillTimer = null, imageFilterRetryTimer = null;
		var imageFilterStatesConvolve = false;
		var imageFiltersApplied = [], tileImages = [];
		var cachedCanvas, cachedCanvasBackfill, cachedCanvasPrefilter, cachedCanvasFiltering;
		var imageFilterBrightnessValue = 0, imageFilterContrastValue = 0, imageFilterSharpnessValue = 0, imageFilterBlurrinessValue = 0, imageFilterColorRedValue = 0, imageFilterColorGreenValue = 0, imageFilterColorBlueValue = 0, imageFilterColorRedRangeValue = 0, imageFilterColorGreenRangeValue = 0, imageFilterColorBlueRangeValue = 0, imageFilterColorRedRangeValue2 = 0, imageFilterColorGreenRangeValue2 = 0, imageFilterColorBlueRangeValue2 = 0, imageFilterGammaValue = 0, imageFilterGammaRedValue = 0, imageFilterGammaGreenValue = 0, imageFilterGammaBlueValue = 0, imageFilterHueValue = 0, imageFilterSaturationValue = 0, imageFilterLightnessValue = 0, imageFilterWhiteBalanceValue = 0, imageFilterEqualizeValue = 0, imageFilterNoiseValue = 0, imageFilterGlowValue = 0;
	}
	if (Z.watermarks) {
		var watermarkImage, watermarkAlpha;
		var watermarksX = [], watermarksY = [];
	}
	if (Z.imageList) {
		var imageCurrent, imageList, imageListPosition, imageListW, imageListSource;
		var imageListDP = [];
	}
	if (Z.magnifierVisible > 0) {
		var tilesMagnifierLoadingNames = [], tilesMagnifierCached = [], tilesMagnifierRetryNames = [];
		var cmgD, cmgS, mgD, mgS, mgCtx, mgB, mgbS;
		var magnifierContainer, halfW, halfH, magBtnDim, magMinimized;
		var bMMX, bMMN;
	}
	if (Z.annotationFileList){
		var annotationFileList;
		var annotationFileListDP = [];
	}

	// Prepare tour variables if optional parameter set. Hotspot variables below also prepared because hotspotPath set to tourPath.
	// If screensaver, prepare tour variables but use modified in tour functions.
	if (Z.tour) {
		var destinationCurrent, destinationNextAudio, tourAutoStart, tourAutoLoop;
	}

	// Prepare multi-image/multi-viewport variables if optional comparison/slideshow/animation/slidestack path parameter is set using image path parameter.
	if (Z.imagePath !== null) {
		if (Z.imagePath.indexOf('zComparisonPath') != -1) {
			Z.imageSetPath = Z.imagePath.substring(16, Z.imagePath.length);
			Z.imageSet = true;
			Z.comparison = true;
		} else if (Z.imagePath.indexOf('zSlidePath') != -1) {
			Z.slidePath = Z.imagePath.substring(11, Z.imagePath.length);
			Z.slideshow = true;
		} else if (Z.imagePath.indexOf('zAnimationPath') != -1) {
			Z.imageSetPath = Z.imagePath.substring(15, Z.imagePath.length);
			Z.imageSet = true;
			Z.animation = true;
		} else if (Z.imagePath.indexOf('zSlidestackPath') != -1) {
			Z.imageSetPath = Z.imagePath.substring(16, Z.imagePath.length);
			Z.imageSet = true;
			Z.slidestack = true;
		}
	}

	if (Z.slideshow) {
		var slides = [], slideListDP = [];
		var slideCurrent, slideList, slideListPosition, slideListW, slideListSource, slideshowAutoStart, slideshowAutoLoop;
		var slideTransitionStep = (parseFloat(Z.Utils.getResource('DEFAULT_SLIDETRANSITIONSTEP')) * Z.slideTransitionSpeed);
		Z.slideTransitionTimeout = null;
		Z.slideOpacity = 0;
	}

	// Prepare hotspot and/or annotation variables global to Viewport if optional parameter set.
	if (Z.zoomRectangle || Z.measureVisible || Z.tour || Z.hotspots || Z.annotations || Z.tracking) {
		var zoomRectangleDragging = null, zoomRectanglePriorID = null;
		var mTypeLegacy = false;
		var hotspots = [], hotspotsMedia = [], hotspotPopups = [], hotspotsFilterDisplayIDs = [], hotspotsFilterDisplayInternalIDs = [];
		var hotspotCurrent = null, hotspotCurrentID = null, hotspotDragging = null, hotspotDragPtStart = null, hotspotDragPtEnd = null, hotspotDragTimeStart = null;
		var dragHotspot, editHotspot, panImage, resizeZoomRectangle;
		var hotspotPopupsMaxZIndex = 0, poiPriorID = null, labelPriorID = null, notePriorID = null;
		var MOUSECLICK_THRESHOLD_HOTSPOT = parseInt(Z.Utils.getResource('DEFAULT_MOUSECLICKTHRESHOLDHOTSPOT'), 10);
		var annotationPanelDisplay;
		var polygonCurrentPts = null, polygonsRequireCanvasAlertShown = false;
		var polygonComplete = true, controlPointCurrent = null, controlPointDragging = false;
		var polyPtDensity = 2, polyPtPrior = null;		
		var hotspotNetConnector = new Z.NetConnector();

		var shapeLineW = Z.Utils.getResource('DEFAULT_SHAPELINEWIDTH');
		var polygonLineW = Z.Utils.getResource('DEFAULT_POLYGONLINEWIDTH');
		var polygonOpacity = parseFloat(Z.Utils.getResource('DEFAULT_POLYGONALPHA'));
		var polygonViewBuffer = parseInt(Z.Utils.getResource('DEFAULT_POLYGONVIEWBUFFER'), 10);
		var ctrlPtLineW = Z.Utils.getResource('DEFAULT_CONTROLPOINTLINEWIDTH');
		var ctrlPtStrokeColor = Z.Utils.getResource('DEFAULT_CONTROLPOINTSTROKECOLOR');
		var firstCtrlPtFillColor = Z.Utils.getResource('DEFAULT_FIRSTCONTROLPOINTFILLCOLOR');
		var stdCtrlPtFillColor = Z.Utils.getResource('DEFAULT_STANDARDCONTROLPOINTFILLCOLOR');
		var ctrlPtRadius = parseInt(Z.Utils.getResource('DEFAULT_CONTROLPOINTRADIUS'), 10);
		var polygonLineWFreehand = Z.Utils.getResource('DEFAULT_POLYGONLINEWIDTHFREEHAND');
		
		var captionTextColor = (Z.captionTextColor) ? Z.Utils.stringValidateColorValue(Z.captionTextColor) : Z.Utils.getResource('DEFAULT_CAPTIONTEXTCOLOR');
		var captionBackColor = (Z.captionBackColor) ? Z.Utils.stringValidateColorValue(Z.captionBackColor) : Z.Utils.getResource('DEFAULT_CAPTIONBACKCOLOR');
		var selectedLineColor = Z.Utils.getResource('DEFAULT_LABELSTROKECOLOR');
		var selectedFillColor = Z.Utils.getResource('DEFAULT_LABELFILLCOLOR');
		
		var defaultFontSize = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONFONTSIZE'), 10);
		var minFontSize = parseInt(Z.Utils.getResource('DEFAULT_MINHOTSPOTCAPTIONFONTSIZE'), 10);
		var maxFontSize = parseInt(Z.Utils.getResource('DEFAULT_MAXHOTSPOTCAPTIONFONTSIZE'), 10);
		var defaultPadding = parseInt(Z.Utils.getResource('DEFAULT_HOTSPOTCAPTIONPADDING'), 10);
		var minPadding = parseInt(Z.Utils.getResource('DEFAULT_MINHOTSPOTCAPTIONPADDING'), 10);
		var maxPadding = parseInt(Z.Utils.getResource('DEFAULT_MAXHOTSPOTCAPTIONPADDING'), 10);
		if (Z.mobileDevice) { ctrlPtRadius *= 2; }

		if (Z.maskVisible) {
			var labelNoMaskArr = [];
			var maskFadeStep = (parseFloat(Z.Utils.getResource('DEFAULT_MASKFADESTEP')) * Z.maskFadeSpeed);
			// Alternative implementation: Mask sync'ing on view updates. Unnecessary for current implementation which clears on interaction.
			Z.setCallback('viewUpdateComplete', function () {
				if (Z.maskingSelection) { updateMask(); }
			} );
		}

		if (Z.tour || Z.hotspots) {
			var hotspotList, hotspotListSource, hotspotListPosition, hotspotsInitialVisibility;
			var hotspotsMinScale, hotspotsMaxScale;
			var hotspotListDP = [];
			var labelShapeDefaultW = parseFloat(Z.Utils.getResource('DEFAULT_LABELSHAPEWIDTH'));
			var labelShapeDefaultH = parseFloat(Z.Utils.getResource('DEFAULT_LABELSHAPEHEIGHT'));
			var labelListDP = [], labelListCurrentDP = [];

		} else if (Z.zoomRectangle || Z.measureVisible || Z.annotations || Z.tracking) {
			var annotationsXML, annotationsXMLRollback, annotationPanelPosition, annotationXMLVersion;
			var poiList, noteList, labelList, labelsMinScale, labelsMaxScale, captionTextElement;
			var poiVisibility, labelVisibility, noteVisibility, commentVisibility, poiVisibilityXML, labelVisibilityXML, noteVisibilityXML, commentVisibilityXML, tooltipSource;
			var poiListDP = [], noteListDP = [], noteListCurrentDP = [];
			var labelListDP = [], labelListCurrentDP = [], labelShapeListDP = []; labelLineStyleListDP = []; labelCaptionPositionListDP = []; labelTargetListDP = [];
			var hotspotsRollback = [], poiListDPRollback = [], labelListDPRollback = [], polygonRollback = [], noteListDPRollback = [];
			var createdNewLabel = false, labelModePrior = null;
			var scaleVal = 0, scaleTimer = null;
			var labelScaleStepDistance = parseFloat(Z.Utils.getResource('DEFAULT_LABELSCALESTEPDISTANCE'));
			var labelScaleStepDuration = parseInt(Z.Utils.getResource('DEFAULT_LABELSCALESTEPDURATION'), 10);
			var labelShapeDefaultW = parseFloat(Z.Utils.getResource('DEFAULT_LABELSHAPEWIDTH'));
			var labelShapeDefaultH = parseFloat(Z.Utils.getResource('DEFAULT_LABELSHAPEHEIGHT'));
			if (Z.mobileDevice) { labelScaleStepDistance /= 2; }
		}
	}

	// Load image properties to get image width and height and tile size.  Alert user that local viewing is not
	// supported in certain browsers nor from storage alternatives other than image folders. Image properties
	// are HTML parameters from web page, bytes from image server, ZIF, PFF file, or XML values.
	if (Z.imagePath !== null && Z.imagePath != 'null') {

		// Prevent initialization if attempting to view Zoomify Folder locally and not in Firefox, or ZIF or PFF locally without file access support.
		var viewingOK = !Z.localUse;
		if (Z.localUse) {
			if (Z.tileSource == 'ZoomifyZIFFile' && !Z.useLocalFile) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-ZIF'), false, Z.messageDurationShort, 'center');
			} else if (Z.tileSource == 'ZoomifyPFFFile' && !Z.useLocalFile) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-PFF'), false, Z.messageDurationStort, 'center');
			} else if ((Z.browser == Z.browsers.CHROME  || Z.browser == Z.browsers.OPERA || (Z.browser == Z.browsers.IE && Z.browserVersion == 11) || (Z.browser == Z.browsers.SAFARI && Z.browserVersion >= 7))) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-BROWSER'), false, Z.messageDurationStandard, 'center');
			} else {
				viewingOK = true;
			}
		}

		if (Z.imageW !== null && Z.imageH !== null && Z.sourceMagnification !== null ) {
			// Example image server protocol implementation: image properties provided via HTML parameters.
			// Note that this approach sets width, height, and tile size values directly from parameters during page
			// loading so it sets those values prior to viewer initialization and never during reinitialization.
			// See additional notes in function loadImagePropertiesImageServer.
			if (typeof self.getStatus !== 'undefined') {					
				initializeViewport(Z.imageW, Z.imageH, TILE_WIDTH, TILE_HEIGHT, null, null, null, null, Z.sourceMagnification, Z.focal, Z.quality);
			} else {
				var viewportInitTimer = window.setTimeout( function () { initializeViewport(Z.imageW, Z.imageH, TILE_WIDTH, TILE_HEIGHT, null, null, null, null, Z.sourceMagnification, Z.focal, Z.quality); }, 100);
			}
			//var netConnector = new Z.NetConnector();
			//loadImageProperties(imagePath, netConnector);

		} else if (Z.imageProperties !== null) {
			// Receive image properties as XML text in HTML parameter. Convert to XML doc and parse - skipping XML loading steps. This
			// approach provides workaround for cross-domain image storage and also enables optional support for image server tile fulfillment.
			var xmlDoc = Z.Utils.xmlConvertTextToDoc(Z.imageProperties);
			viewingOK = false;
			parseImageXML(xmlDoc);

		} else if (Z.tileSource == 'unconverted') {		
			// Load unconverted image and use its dimensions to set needed values.
			viewingOK = false; // Next line performs loading.
			loadUnconvertedImage(imagePath);

		} else if (Z.imagePath.indexOf('zComparisonPath') == -1 && Z.imagePath.indexOf('zSlidePath') == -1 && Z.imagePath.indexOf('zOverlayPath') == -1 && Z.imagePath.indexOf('zAnimationPath') == -1 && Z.imagePath.indexOf('zSlidestackPath') == -1) {
			// Load byte range from ZIF or PFF or ImageProperties.xml file from Zoomify Image folder.
			viewingOK = true;
		} else {
			viewingOK = false;
		}

		if (viewingOK) {
			var netConnector = new Z.NetConnector();
			loadImageProperties(imagePath, netConnector, viewportID);
		}
	}

	// Load list of images in XML file if image list is to be presented. If image path parameter not provided and
	// image properties not loaded above, first values in image list XML file will be used at end of parseImageListXML function.
	if (Z.imageList) {
		loadImageListXML();
	}

	function loadImageListXML () {
		var defaultFilename = Z.Utils.getResource('DEFAULT_IMAGELISTXMLFILE');
		if (Z.imageListPath.toLowerCase().substring(Z.imageListPath.length - 4, Z.imageListPath.length) != '.xml') {
			Z.imageListPath = Z.imageListPath + '/' + defaultFilename;
		}
		XMLPath = Z.Utils.cacheProofPath(Z.imageListPath);
		if (typeof XMLPath !== 'undefined' && Z.Utils.stringValidate(XMLPath)) {
			var netConnector = new Z.NetConnector();
			netConnector.loadXML(XMLPath, vpID, 'loadingImageListXML');
		}
	}

	// Load list of slides in XML file if multiple images are to be presented. If image path parameter not provided and
	// image properties not loaded above, first values in slides XML file will be used at end of parseSlidesXML function.
	if (Z.slideshow) {
		var netConnector = new Z.NetConnector();
		loadSlidesXML(netConnector);
	}

	function loadSlidesXML (netConnector) {
		var defaultFilename = Z.Utils.getResource('DEFAULT_SLIDESXMLFILE');
		if (Z.slidePath.toLowerCase().substring(Z.slidePath.length - 4, Z.slidePath.length) != '.xml') {
			Z.slidePath = Z.slidePath + '/' + defaultFilename;
		}
		XMLPath = Z.Utils.cacheProofPath(Z.slidePath);
		if (typeof XMLPath !== 'undefined' && Z.Utils.stringValidate(XMLPath)) {
			var netConnector = new Z.NetConnector();
			netConnector.loadXML(XMLPath, null, 'loadingSlidesXML');
		}
	}

	function initializeViewport (iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality) {
		createCanvasContexts();
		// Set viewport variables to XML or header values.
		if (Z.tileSource != 'ZoomifyPFFFile' || !Z.pffJPEGHeadersSeparate) {
			Z.imageW = iW;
			Z.imageH = iH;
			Z.imageCtrX = Z.imageW / 2;
			Z.imageCtrY = Z.imageH / 2;
			Z.imageD = Math.round(Math.sqrt(iW * iW + iH * iH));
			IMAGE_VERSION = iVersion;
			HEADER_SIZE = iHeaderSize;
			HEADER_SIZE_TOTAL = iHeaderSizeTotal;
			TILE_COUNT = iTileCount;
			TILE_WIDTH = tW;
			TILE_HEIGHT = tH;
		}
		
		// Example image server implementation: from example HTML or XML parameters.
		if (iMagnification !== null && iFocal !== null && iQuality !== null) {
			Z.sourceMagnification = iMagnification;
			Z.focal = iFocal;
			Z.quality = iQuality;
		}

		// Record tier dimensions and tile counts for fast access.
		calculateTierValues();

		// Set initial dimensions and location of all viewport displays and ensure initial zoom and pan values and limits do not conflict.
		setSizeAndPosition(viewW, viewH, viewL, viewT);
		self.validateXYZDefaults();

		// Set default scale for oversize backfill canvas or downsize it if image size doesn't require it.
		// Do not remove in case larger image is subsequently displayed - recreation would place over other canvases.
		if (tierCount > backfillTreshold3) {
			tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, Z.initialZ);
			if (oD) { oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale); }
		} else {
			if (oS) {
				oS.width = '0px';
				oS.height = '0px';
			}
		}
		
		// Set default scales for other canvases.
		tierBackfillScale = convertZoomToTierScale(tierBackfill, Z.initialZ);
		tierScale = convertZoomToTierScale(tierCurrent, Z.initialZ);
		tierScalePrior = tierScale;
		if (Z.useCanvas) {
			// Trap possible NS_ERROR_FAILURE error if working with large unconverted image.
			// DEV NOTE: Add retry or soft fail in catch in future implementation for firefox issue with large canvases.
			try {
				vCtx.scale(tierScale, tierScale);
			} catch (e) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_SCALINGCANVASFORUNCONVERTEDIMAGE'), false, Z.messageDurationStandard, 'center');
				console.log('In function initializeViewportContinue scaling canvas:  ' + e);
			}
		}

		if (Z.tileSource != 'unconverted') { self.precacheBackfillTiles(); }

		view(Z.initialX, Z.initialY, Z.initialZ, Z.initialR, null, true);

		// Set initial display to full screen if parameter true.
		if (Z.initialFullPage) { self.toggleFullViewMode(true); }

		// Enable event handlers specific to Viewport and set viewport as initialized.
		initializeViewportEventListeners();
		self.setStatus('initializedViewport', true);
		self.syncViewportRelated();

		// Set callback to update ruler, image list, annotations, and/or annotation list, if image changes.
		Z.setCallback('imageChanged', Z.Viewport.updateImageComponents);

		// Start slideshow if optional parameter set, go to next slide is slideshow playing.
		if (Z.slideshow) {
			var indexTitleAdjust = (Z.Utils.stringValidate(Z.slideListTitle) && Z.slideListTitle != 'none') ? 1 : 0;
			if (typeof slideList !== 'undefined') { slideList.selectedIndex = indexTitleAdjust; }
			if (slideshowAutoStart && !Z.slideshowPlaying) {
				self.slideshowStart();
			} else if (Z.slideshowPlaying) {
				self.nextSlide();
			}
		}

		// If viewing imageSet set callback to ensure hotspots/annotations draw correctly.
		if (Z.imagePath == "multiple") {
			var hotspotsRedisplayEvent = (Z.hotspots) ? 'hotspotsLoadedViewer' : (Z.annotations) ? 'annotationsLoadedViewer' : null;
			var hotspotsRedisplay = function () {
				var imageSetHotspotsTimeout = window.setTimeout( function () {
						Z.viewportCurrent.redisplayHotspots();
					}, 1500);
				};
			if (hotspotsRedisplayEvent !== null) { Z.setCallback(hotspotsRedisplayEvent, hotspotsRedisplay); }
		}
	}

	// Initialization on callback after XML load after change of image path via setImage function.
	function reinitializeViewport (iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality) {
		// Clear prior image values.
		self.setStatus('initializedViewport', false);
		self.clearAll(true, false, true, true);

		// Calculate new image values.
		if (Z.tileSource != 'ZoomifyPFFFile' || !Z.pffJPEGHeadersSeparate) {
			Z.imageW = iW;
			Z.imageH = iH;
			Z.imageCtrX = Z.imageW / 2;
			Z.imageCtrY = Z.imageH / 2;
			Z.imageD = Math.round(Math.sqrt(iW * iW + iH * iH));
			IMAGE_VERSION = iVersion;
			HEADER_SIZE = iHeaderSize;
			HEADER_SIZE_TOTAL = iHeaderSizeTotal;
			TILE_COUNT = iTileCount;
			TILE_WIDTH = tW;
			TILE_HEIGHT = tH;
		}
		
		// DEV NOTE: Review need for clearing of components as will cause loss of custom Toolbar skin setting, custom component 
		// sizes or positions, etc. Not required to permit subsequent call to setParameters to update initial view or other values. 
		//if (!Z.narrative && !Z.slideshow) { Z.Viewer.validateComponents(vpControl); }
		
		Z.Utils.setParameters(Z.parameters);
		
		// Optional HTML parameter custom tile dimensions override defaults, XML values, or server provided values.
		// but not custom tile dimensions applied in image list optional parameter values, so must override here.
		if (Z.imageList) {
			if (Z.tileW != tW) { TILE_WIDTH = tW = Z.tileW; }
			if (Z.tileH != tH) { TILE_HEIGHT = tH = Z.tileH; }
		}

		calculateTierValues();

		if (Z.hotspotPath !== null) {
			hotspotPath = Z.hotspotPath;
			hotspotFolder = Z.hotspotFolder;
		}

		if (Z.annotationPath !== null) {
			annotationPath = Z.annotationPath;
			annotationFolder = Z.annotationFolder;
		}

		createDisplays(); // Create hotspots or annotation display and list or panel if required.
		createCanvasContexts();
		self.validateXYZDefaults();

		// Set default scale for oversize backfill canvas or remove it if image size doesn't require it.
		if (tierCount > backfillTreshold3) {
			tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, Z.initialZ);
			if (oD) {
				oCtx.restore();
				oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
			}
		} else {
			if (oS) {
				oS.width = '0px';
				oS.height = '0px';
			}
		}

		// Set default scales for other canvases.
		tierBackfillScale = convertZoomToTierScale(tierBackfill, Z.initialZ);
		tierScale = convertZoomToTierScale(tierCurrent, Z.initialZ);
		tierScalePrior = tierScale;
		if (Z.useCanvas) {
			vCtx.restore();
			vCtx.scale(tierScale, tierScale);
		}

		// Load watermark, hotspots or annotations, virtual pointer, backfill tiles, and set initial view.
		if (hD) {
			self.setDrawingColor('buttonColor0' + viewportID, true);
			if (Z.hotspots || Z.tour) {
				loadHotspotsXML(viewportID);
			}
		}

		if (Z.virtualPointerVisible) { Z.Viewer.createVirtualPointer(); }
		if (Z.tileSource != 'unconverted') { self.precacheBackfillTiles(); }

		// Set size and position and update view with new default initial coordinates unless Comparing, in which case use initial coordinates in comparison.xml file and if none, do not reset coordinates.
		self.setSizeAndPosition(viewW, viewH, viewL, viewT);
		var initialValuesSet = (typeof Z.parameters !== 'undefined' && Z.parameters !== null && (typeof Z.parameters.zInitialX !== 'undefined' || typeof Z.parameters.zInitialY !== 'undefined' || typeof Z.parameters.zInitialZoom !== 'undefined'));
		if ((Z.comparison || Z.overlays) && !initialValuesSet) {
		 	view(Z.priorX, Z.priorY, Z.priorZ, Z.priorR, null, true);
		} else {
			view(Z.initialX, Z.initialY, Z.initialZ, Z.initialR, null, true);
		}

		Z.Utils.validateCallback('imageChanged');
		self.setStatus('initializedViewport', true);

		// Set Navigator thumbnail image and load tracking data if any.
		var navCurrent = (vpID == 0) ? Z.Navigator : Z.Navigator2;
		if (navCurrent) { navCurrent.setImage(self.getImagePath()); }

		// Reinitialize related components.
		var topVP = Z['Viewport' + (Z.imageSetLength - 1).toString()];
		var vpControl = (Z.overlays) ? topVP : Z.viewportCurrent;

		// Configure components. First clear and recreate if new settings in params.
		// Do not clear and recreate if slideshow in progress.
		Z.Viewer.configureComponents(vpControl);

		// Sync related components.
		self.syncViewportRelated();

		// Validate callback, if any;
		Z.Utils.validateCallback('reinitializedViewport');

		// Go to next slide if slideshow playing.
		if (Z.slideshowPlaying) { self.nextSlide(); }
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
		tilesBackfillToPrecacheLoaded = 0;
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
		if (typeof tilesMagnifierLoadingNames !== 'undefined') { Z.Utils.arrayClear(tilesMagnifierLoadingNames); }
		if (typeof tilesMagnifierCached !== 'undefined') { Z.Utils.arrayClear(tilesMagnifierCached); }
		
		// ZIF & PFF support.
		if (typeof tilesRetry !== 'undefined') { Z.Utils.arrayClear(tilesRetry); }
		if (typeof tilesRetryNamesChunks !== 'undefined') { Z.Utils.arrayClear(tilesRetryNamesChunks); }
		if (typeof tilesRetryNames !== 'undefined') { Z.Utils.arrayClear(tilesRetryNames); }
		if (typeof tilesBackfillRetryNames !== 'undefined') { Z.Utils.arrayClear(tilesBackfillRetryNames); }
		if (typeof tilesMagnifierRetryNames !== 'undefined') { Z.Utils.arrayClear(tilesMagnifierRetryNames); }

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
			} else if (!Z.narrative) {
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
			annotationPath = null;
			Z.annotationPath = null;
			annotationFolder = null;
			Z.annotationFolder = null;
		}
	}

	function clearDisplays () {
		if (oD) { Z.Utils.clearDisplay(oD); }
		if (bD) { Z.Utils.clearDisplay(bD); }
		if (vD) { Z.Utils.clearDisplay(vD); }
		if (tC) { Z.Utils.clearDisplay(tC); }
		if (wD) { Z.Utils.clearDisplay(wD); }
		if (mC) { Z.Utils.clearDisplay(mC); }
		if (hD) {
			Z.Utils.clearDisplay(hD);
			hD = null;
		}
		if (cmgD) {
			self.setStatus('magnifierInitializedViewport', false);
			cmgD = null;
		}
	
		// Clear display unless viewing or editing narrative, then repopulate.
		if (annD && !Z.narrative) {
			//Z.Utils.clearDisplay(annD); // DEV NOTE: Use next line instead to delete panel DIV.
			self.clearAnnotationPanel(viewportID);
			self.setStatus('annotationPanelInitializedViewport', false);
			annD = null;
		}
		if (dD) { Z.Utils.clearDisplay(dD); }
		if (eD) { Z.Utils.clearDisplay(eD); }
		if (fC) { Z.Utils.clearDisplay(fC); }
		if (fbC) { Z.Utils.clearDisplay(fbC); }
	}

	function createDisplays (vpID) {
		if (typeof vpID === 'undefined' || vpID === null) { vpID = 0; }
		var vpIDStr = vpID.toString();

		// Create non-draggable non-moving, non-resizing deep background display for oversize
		// image temporary low-resolution fill during rapid zoom or pan while backfill and frontfill
		// tiles download. Must draw tiles on-the-fly unlike other displays.
		if (Z.useCanvas) {
			if (!oD) {
				oversizeDisplay = Z.Utils.createContainerElement('canvas', 'oversizeDisplay' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
				Z.ViewerDisplay.appendChild(oversizeDisplay);
				oD = oversizeDisplay;
				oS = oD.style;
			}
		}

		// Create masking container for displays if comparison or narrative panel requires limiting display to part of Viewer.
		if ((Z.comparison || Z.narrative) && !cmD) {
			comparisonMaskContainer = Z.Utils.createContainerElement('div', 'comparisonMaskContainer' + vpIDStr, 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
			Z.ViewerDisplay.appendChild(comparisonMaskContainer);
			cmD = comparisonMaskContainer;
			cmS = cmD.style;
		}

		// Create draggable container for backfill, viewport, watermark, and hotspot displays.
		// Scaling occurs in display canvases directly or in tiles if in non-canvas browser.
		// Set position 'absolute' within parent viewerDisplay container that is set 'relative'.
		if (!cD) {
			viewportContainer = Z.Utils.createContainerElement('div', 'viewportContainer' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
			if (!Z.comparison && !Z.narrative) {
				Z.ViewerDisplay.appendChild(viewportContainer);
			} else {
				comparisonMaskContainer.appendChild(viewportContainer);
			}
			cD = viewportContainer;
			cS = cD.style;
		}

		// Create background display to fill gaps between foreground tiles in viewportDisplay.
		// Note that using canvas is practical because backfill tier is low res and thus small and canvas is CSS scaled large, not internally scaled large or drawn large.
		if (!bD) {
			viewportBackfillDisplay = Z.Utils.createContainerElement(Z.useCanvas ? 'canvas' : 'div', 'viewportBackfillDisplay' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
			viewportContainer.appendChild(viewportBackfillDisplay);
			bD = viewportBackfillDisplay;
			bS = bD.style;
			if (Z.hideOverlayBackfill && vpID != 0) { bS.display = 'none'; }
		}

		// Create canvas or div container for image tiles.
		if (!vD) {
			viewportDisplay = Z.Utils.createContainerElement(Z.useCanvas ? 'canvas' : 'div', 'viewportDisplay' + vpIDStr, 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
			viewportContainer.appendChild(viewportDisplay);
			vD = viewportDisplay;
			vS = vD.style;
		}

		// Create transition canvas, if supported, for temporary display while display canvas is updated.
		// Also create temporary canvases for unifying tile sets for new views prior to applying convolution filters.
		if (Z.useCanvas) {
			if (!tC) {
				transitionCanvas = Z.Utils.createContainerElement('canvas', 'transitionCanvas', 'none', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
				viewportContainer.appendChild(transitionCanvas);
				tC = transitionCanvas;
				tS = tC.style;
			}
		}

		// Create canvas or div container for watermarks.
		if (Z.watermarks && !wD) {
			watermarkDisplay = Z.Utils.createContainerElement('div', 'watermarkDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
			viewportContainer.appendChild(watermarkDisplay);
			wD = watermarkDisplay;
			wS = wD.style;
		}

		// Create masking canvas if hotspot/label selection masking enabled.
		if (Z.maskVisible && !mC) {
			maskCanvas = Z.Utils.createContainerElement('canvas', 'maskCanvas', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
			viewportContainer.appendChild(maskCanvas);
			mC = maskCanvas;
			mS = mC.style;
			mS.display = 'none';
		}

		// Create canvas or div containers for zoom rectangle, measuring, tours, screensavers, hotspots, annotations, editing, and saving to image file.
		var displaying = ((Z.zoomRectangle || Z.measureVisible || (Z.tour && !Z.screensaver) || Z.hotspots || Z.annotations));
		var drawing = Z.useCanvas && (displaying || (Z.hotspots && Z.labelShapesInternal));
		var editing = Z.useCanvas && (Z.zoomRectangle || Z.measureVisible || Z.editMode !== null);
		var saving = drawing && Z.saveImageHandlerProvided;
		if (drawing && !dD) {
			drawingDisplay = Z.Utils.createContainerElement('canvas', 'drawingDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
			viewportContainer.appendChild(drawingDisplay);
			dD = drawingDisplay;
			dS = dD.style;
		}
		if (editing && !eD) {
			editingDisplay = Z.Utils.createContainerElement('canvas', 'editingDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
			viewportContainer.appendChild(editingDisplay);
			eD = editingDisplay;
			eS = eD.style;
		}
		if (displaying && !hD) {
			hotspotDisplay = Z.Utils.createContainerElement('div', 'hotspotDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
			viewportContainer.appendChild(hotspotDisplay);
			hD = hotspotDisplay;
			hS = hD.style;
			Z.Utils.addEventListener(hotspotDisplay, 'mousedown', Z.Utils.preventDefault);
		}
		if (saving && !sD) {
			savingDisplay = Z.Utils.createContainerElement('canvas', 'savingDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
			viewportContainer.appendChild(savingDisplay);
			sD = savingDisplay;
			sS = sD.style;
			sS.display = 'none';
		}

		// Clear prior div contents.
		if (!Z.useCanvas) {
			bD.innerHTML = '';
			vD.innerHTML = '';
		}
		if (wD) { wD.innerHTML = ''; }
		if (hD) { hD.innerHTML = ''; }
	}

	function createCanvasContexts () {
		if (Z.useCanvas) {
			if (oD) { oCtx = oD.getContext('2d'); }
			bCtx = bD.getContext('2d');
			vCtx = vD.getContext('2d');
			tCtx = tC.getContext('2d');
			if (dD) { dCtx = dD.getContext('2d'); }
			if (eD) { eCtx = eD.getContext('2d'); }
			if (mC) { mCtx = mC.getContext('2d'); }
			if (sD) { sCtx = sD.getContext('2d'); }
		}
	}

	// DEV NOTE: Dual setSizeAndPosition functions below are workaround for undefined error on load
	// due to unhoisted function expression vs hoisted function declaration and/or IE8 limitations.
	this.setSizeAndPosition = function (width, height, left, top) {
		setSizeAndPosition(width, height, left, top);
	}

	// Pass in Viewer values and interally adjust for static toolbar or narratives sidebar.
	function setSizeAndPosition (width, height, left, top) {
		// Set Viewport size and set base values or subsequent gets and sets will fail.
		if (typeof left === 'undefined' || left === null) { left = 0; }
		if (typeof top === 'undefined' || top === null) { top = 0; }
		
		if (Z.narrative) { // Adjust for narrative panel width.
			viewW = width - Z.narrativeW;
		} else if (Z.comparison) { 	// Adjust for two viewports.
			viewW = width = width / 2;
		} else {
			viewW = width;
		}

		var tlbrOffset = (Z.toolbarVisible == 1 && Z.toolbarBackgroundVisible) ? (Z.toolbarH !== null) ? Z.toolbarH : parseInt(Z.Utils.getResource('DEFAULT_TOOLBARHEIGHT'), 10) : 0;
		viewH = Z.viewerH - tlbrOffset;
		viewL = 0;
		viewT = (Z.toolbarPosition == 0) ? tlbrOffset : 0;		
			
		// Expand display area if rotation enabled.
		var rotMult = 1;
		if (Z.rotationVisible || Z.imageR != 0) {
			var dimDiag = Math.sqrt(viewW * viewW + viewH * viewH);
			var dimAvg = (viewW + viewH) / 2;
			rotMult = dimDiag / dimAvg;
		}
		
		// Calculate display dimensions.
		displayW = viewW * PAN_BUFFER * rotMult;
		displayH = viewH * PAN_BUFFER * rotMult;
		
		// Prevent canvas sizes too large if working with image set, image is unconverted in Firefox, or for lower limits of other browsers. Additional limit for
		// unconverted images to actual image size plus buffer if pan contraint is non-strict. Mobile devices also limit max canvas size: 3 to 32 decoded
		// megapixels depending on device, file format, and memory. Additional limit on creation of oversize backfill display. Last test ensures canvas at least as large as view area.
		var canvasSizeMax = (Z.imageSet) ? PAN_BUFFERSIZEMAXIMAGESET : (Z.tileSource == 'unconverted' && Z.mobileDevice) ? PAN_BUFFERSIZEMAXMOBILE : (Z.tileSource == 'unconverted' && Z.browser == Z.browsers.FIREFOX) ? PAN_BUFFERSIZEMAXFIREFOX : PAN_BUFFERSIZEMAXBROWSER;
		var imgW = (Z.constrainPanStrict) ? Z.imageW : Z.imageW * 2; // Alternative implementation: Limit to Z.imageW if (Z.constrainPanStrict || (Z.imageSet && Z.tileSource == 'unconverted')).
		var imgH = (Z.constrainPanStrict) ? Z.imageH : Z.imageH * 2;  // Alternative implementation: Limit to Z.imageH if (Z.constrainPanStrict || (Z.imageSet && Z.tileSource == 'unconverted')).
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

		// Set viewport masking container dimension and position.
		if (Z.narrative || Z.comparison) {
			cmD.width = viewW;
			cmD.height = viewH;
			cmS.width = viewW + 'px';
			cmS.height = viewH + 'px';
			cmS.left = (Z.narrative) ? Z.narrativeW + 'px' : (vpID == 0) ? '0px' : viewW + 'px';
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
			wS.zIndex = (Z.baseZIndex + 2).toString();
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

		// Set drawing origin coordinates to viewport display center.
		if (Z.useCanvas) {
			if (oD) {
				oCtx.translate(viewW / 2, viewH / 2);
				oCtx.save();
			}

			// Trap possible NS_ERROR_FAILURE error especially in firefox especially if working with large unconverted image.
			// DEV NOTE: Add retry or soft fail in catch in future implementation for firefox issue with large canvases.
			try {
				vCtx.translate(displayCtrX, displayCtrY);
			} catch (e) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_TRANSLATINGCANVASFORUNCONVERTEDIMAGE'), false, Z.messageDurationStandard, 'center');
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
		self.resizeViewport(imgX, imgY, imgZ, imgR);
	}

	this.resizeViewport = function (imgX, imgY, imgZ, imgR) {
		self.validateXYZDefaults();
		self.setSizeAndPosition(Z.viewerW, viewH, 0, 0);
		self.setView(imgX, imgY, imgZ, imgR);
	}

	this.loadImageProperties = function (imgPath, netCnnctr, vpID) {
		loadImageProperties(imgPath, netCnnctr, vpID);
	};

	function loadImageProperties (imgPath, netCnnctr, vpID) {
		// Load image properties from Zoomify Image ZIF file header, folder XML file, PFF file header, or other specified tile source.
		if (Z.tileSource == 'ZoomifyZIFFile') {
			loadImagePropertiesZIF(imgPath, netCnnctr, vpID);
		} else if (Z.tileSource == 'ZoomifyImageFolder') {
			var imageXMLPath = Z.Utils.cacheProofPath(imgPath + '/' + 'ImageProperties.xml');
			netCnnctr.loadXML(imageXMLPath, vpID, 'loadingImagePropertiesXML');
		} else if (Z.tileSource == 'ZoomifyPFFFile') {
			loadImagePropertiesPFF(imgPath, netCnnctr, vpID);
		} else if (Z.tileSource == 'DZIFolder') {
			var imagePropsPath = formatFilePathDZI(imgPath, 'properties');
			netCnnctr.loadXML(imagePropsPath, vpID, 'loadingDZIPropertiesXML');
		} else if (Z.tileSource == 'IIIFImageServer') {
			var imageJSONPath = imgPath + '/' + 'info.json';
			loadImagePropertiesIIIFImageServer(imageJSONPath, netCnnctr, vpID);
		} else if (Z.tileSource == 'ImageServer') {
			// Example image server protocol implementation.
			loadImagePropertiesImageServer(imgPath, netCnnctr, vpID);
		}
	}

	function loadImagePropertiesZIF (imgPath, netCnnctr, vpID) {
		// Define constants. Load enough bytes for TIF IFDs for pyramid between 2,164,260,864 x 2,164,260,864 pixels
		// and 4,294,967,296 x 4,294,967,296 pixels (assuming a tile size of 256 x 256).
		var HEADER_START_BYTE = parseFloat(Z.Utils.getResource('DEFAULT_HEADERSTARTBYTE'));
		var HEADER_END_BYTE = parseFloat(Z.Utils.getResource('DEFAULT_HEADERENDBYTEZIF'));
		netCnnctr.loadByteRange(imgPath, HEADER_START_BYTE, HEADER_END_BYTE, 'loadingZIFFileBytes', 'header', null, null, vpID);
	}

	function loadImagePropertiesPFF (imgPath, netCnnctr, vpID) {
		// Define constants.
		var REQUEST_TYPE = 1; // 1 = header, 2 = offset, 0 = tile.		
		if (Z.tileHandlerPathFull === null) {
			// PFF viewing without servlet.
			var HEADER_START_BYTE = parseFloat(Z.Utils.getResource('DEFAULT_HEADERSTARTBYTE'));
			var HEADER_END_BYTE = parseFloat(Z.Utils.getResource('DEFAULT_HEADERENDBYTEPFF'));
			netCnnctr.loadByteRange(imgPath, HEADER_START_BYTE, HEADER_END_BYTE, 'loadingPFFFileBytes', 'header', null, null, vpID);

		} else {
			// PFF viewing with servlet. Build data request with query string and send.
			var HEADER_START_BYTE = Z.Utils.getResource('DEFAULT_HEADERSTARTBYTE');
			var HEADER_END_BYTE = Z.Utils.getResource('DEFAULT_HEADERENDBYTEPFF');
			var imgPathNoDot = imgPath.replace('.', '%2E');  // Required for servlet.
			var imageXMLPath = Z.tileHandlerPathFull + '?file=' + imgPathNoDot  + '&requestType=' + REQUEST_TYPE + '&begin=' + HEADER_START_BYTE + '&end=' + HEADER_END_BYTE;
			netCnnctr.loadXML(imageXMLPath, vpID, 'loadingPFFPropertiesServletXML');
		}
	}

	function loadImagePropertiesIIIFImageServer (iiifInfoPath, netCnnctr, vpID) {
		netCnnctr.loadJSON(iiifInfoPath, vpID, 'loadingIIIFJSON');
	}

	function loadImagePropertiesImageServer (imgPath, netCnnctr, vpID) {
		// Example image server protocol implementation - optional implementation:
		// Image properties provided by image server.  Modify the following line to request
		// image properties according to specific 3rd party image server protocol as documented
		// by image server provider. Minimum return values required: full source image width and
		// height, and tile size if not 256x256 pixels. Additionally modify function 'parseImageXML'
		// as noted in 'Optional implementation' notes within that function.
		//var imageXMLPath = Z.tileHandlerPathFull + '?' + '...';
		//netCnnctr.loadXML(imageXMLPath, vpID, 'loadingImagePropertiesServerXML');
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
			maxTier = tierCount - 1;

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
				if (!self.getStatus('initializedViewport')) {
					initializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);
				} else {
					reinitializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);
				}
			} else {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESINVALID'), false, Z.messageDurationStandard, 'center');
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
			loadHandler = (self.getStatus('imageSaving')) ? onTileLoadToSave : onTileLoad;
		} else if (target == 'image-backfill') {
			loadHandler = (self.getStatus('imageSaving')) ? onTileBackfillLoadToSave : onTileBackfillLoad;
		} else if (target == 'image-magnifier') {
			loadHandler = onTileLoadMagnifier;
		} else if (target == 'navigator') {
			if (!Z.comparison || viewportID == 0) {
				if (Z.Navigator) { loadHandler = Z.Navigator.initializeNavigator; }
			} else {			
				if (Z.Navigator2) { loadHandler = Z.Navigator2.initializeNavigator; } 
			}
		} else if (target == 'gallery') {
			loadHandler = Z.Gallery.initializeGallery;
		}
		
		var func = Z.Utils.createCallback(null, loadHandler, tile);
		Z.Utils.createImageElementFromBytes(src, func);
	}

	this.parsePFFImage = function (data, tile, target) {
		var src;
		if (Z.pffJPEGHeadersSeparate) {
			var jpegHeaderIndex = Z.Utils.intValue(data, data.length-4, true);
			src = 'data:image/jpeg;base64,' + Z.Utils.encodeBase64(jpegHeaderArray[jpegHeaderIndex], 0) + Z.Utils.encodeBase64(data, 0);
		} else {
			src = 'data:image/jpeg;base64,' + Z.Utils.encodeBase64(data);		
		}

		var loadHandler;
		if (target == 'image-display') {
			loadHandler = (self.getStatus('imageSaving')) ? onTileLoadToSave : onTileLoad;
		} else if (target == 'image-backfill') {
			loadHandler = (self.getStatus('imageSaving')) ? onTileBackfillLoadToSave : onTileBackfillLoad;
		} else if (target == 'image-magnifier') {
			loadHandler = onTileLoadMagnifier;
		} else if (target == 'navigator') {
			loadHandler = Z.Navigator.initializeNavigator;
		} else if (target == 'gallery') {
			loadHandler = Z.Gallery.initializeGallery;
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
			Z.pffJPEGHeadersSeparate = true;

			iW = Z.Utils.intValue(data, 1052, true);
			iH = Z.Utils.intValue(data, 1056, true);
			tW = tileSize;
			tH = tileSize;

			// Debug option: Display ZIF header values.
			//console.log('Version: ' + version + ' Tile W & H: ' + tW + ' Header Size: ' + iHeaderSizeTotal + ' Tile Count: ' + iTileCount + ' Image W & H: ' + iW + ', ' + iH);

			// Call to initialize viewport unless PFF JPEG headers are separate in which case set globals here before detour to load JPEG headers.
			if (!Z.pffJPEGHeadersSeparate) {
				initializeOrReinitializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);

			} else {
				Z.imageW = iW;
				Z.imageH = iH;
				Z.imageCtrX = Z.imageW / 2;
				Z.imageCtrY = Z.imageH / 2;
				Z.imageD = Math.round(Math.sqrt(iW * iW + iH * iH));
				IMAGE_VERSION = iVersion;
				HEADER_SIZE = iHeaderSize;
				HEADER_SIZE_TOTAL = iHeaderSizeTotal;
				TILE_COUNT = iTileCount;
				TILE_WIDTH = tW;
				TILE_HEIGHT = tH;		
				var netConnector = new Z.NetConnector();
				netConnector.loadByteRange(imagePath, offsetToJPEGHeaders, iHeaderSizeTotal, 'loadingPFFFileBytes', 'jpegHeaders');
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
		if ((Z.tileSource == 'ZoomifyPFFFile' && Z.pffJPEGHeadersSeparate) || (!isNaN(iW) && iW > 0 && !isNaN(iH) && iH > 0 && !isNaN(tW) && tW > 0 && !isNaN(tH) && tH > 0 && iTileCount > 0)) {
			if (!self.getStatus('initializedViewport')) {
				initializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);
			} else {
				reinitializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality);
			}
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESINVALID'), false, Z.messageDurationStandard, 'center');
		}
	}

	this.parseImageXML = function (xmlDoc, callback) {
		parseImageXML(xmlDoc, callback);
	}

	function parseImageXML (xmlDoc, callback) {
		clearTierValues();
		if (typeof self.getStatus === 'undefined') {
			var viewportInitTimer = window.setTimeout( function () { parseImageXML(xmlDoc, callback); }, 100);
		} else {
			// Get key properties of Zoomify Image and initialize Viewport.
			var iW = null, iH = null, tW = null, tH = null, iTileCount = null, iImageCount = null, iVersion = null, iHeaderSize = null, iHeaderSizeTotal = null, iMagnification = null, iFocal = null, iQuality = null;

			if (Z.tileSource == 'ZoomifyImageFolder') {
				iW = parseInt(xmlDoc.documentElement.getAttribute('WIDTH'), 10);
				iH = parseInt(xmlDoc.documentElement.getAttribute('HEIGHT'), 10);
				iTileCount = parseInt(xmlDoc.documentElement.getAttribute('NUMTILES'), 10);
				iImageCount = parseInt(xmlDoc.documentElement.getAttribute('NUMIMAGES'), 10);
				iVersion = parseInt(xmlDoc.documentElement.getAttribute('VERSION'), 10);
				tW = tH = parseInt(xmlDoc.documentElement.getAttribute('TILESIZE'), 10);
			} else if (Z.tileSource == 'DZIFolder') {
				iTileCount = 1;
				iImageCount = 1;
				iVersion = 1;
				var imageNodes = xmlDoc.getElementsByTagName('Image');
				var imageFirst = imageNodes[0];
				tW = tH = parseInt(imageFirst.getAttribute('TileSize'), 10);
				var overlap = parseInt(imageFirst.getAttribute('Overlap'), 10);
				Z.tileType = imageFirst.getAttribute('Format');
				var sizeNodes = imageFirst.getElementsByTagName('Size');	
				var sizeFirst = sizeNodes[0];		
				iW = parseInt(sizeFirst.getAttribute('Width'), 10);
				iH = parseInt(sizeFirst.getAttribute('Height'), 10);
			} else if (Z.tileSource == 'ZoomifyPFFFile') {
				iW = parseInt(xmlDoc.documentElement.getAttribute('WIDTH'), 10);
				iH = parseInt(xmlDoc.documentElement.getAttribute('HEIGHT'), 10);
				tW = tH = parseInt(xmlDoc.documentElement.getAttribute('TILESIZE'), 10);
				iTileCount = parseInt(xmlDoc.documentElement.getAttribute('NUMTILES'), 10);
				iImageCount = parseInt(xmlDoc.documentElement.getAttribute('NUMIMAGES'), 10);
				iVersion = parseInt(xmlDoc.documentElement.getAttribute('VERSION'), 10);
				iHeaderSize = parseInt(xmlDoc.documentElement.getAttribute('HEADERSIZE'), 10);
				iHeaderSizeTotal = 904 + 136 + 20 + iHeaderSize;
			} else if (Z.tileSource == 'IIIFImageServer') {
				// Allow for partial value set. All fields but image width and height will need to be internally calculated.
				iW = parseInt(xmlDoc.documentElement.getAttribute('WIDTH'), 10);
				iH = parseInt(xmlDoc.documentElement.getAttribute('HEIGHT'), 10);
				iTileCount = iImageCount = iVersion = tW = tH = null;
			} else if (Z.tileSource == 'ImageServer') {
				// Allow for partial XML where submission is via zImageProperties HTML parameter
				// because in that context all fields but image width and height will be optional.
				iW = parseInt(xmlDoc.documentElement.getAttribute('WIDTH'), 10);
				iH = parseInt(xmlDoc.documentElement.getAttribute('HEIGHT'), 10);
				var tempTSz = xmlDoc.documentElement.getAttribute('TILESIZE');
				tW = (Z.Utils.stringValidate(tempTSz)) ? parseInt(tempTSz, 10) : TILE_WIDTH;
				tH = (Z.Utils.stringValidate(tempTSz)) ? parseInt(tempTSz, 10) : TILE_HEIGHT;
				var tempMag = xmlDoc.documentElement.getAttribute('MAGNIFICATION');
				iMagnification = (Z.Utils.stringValidate(tempMag)) ? parseInt(tempMag, 10) : Z.sourceMagnification;
				var tempFoc = xmlDoc.documentElement.getAttribute('FOCAL');
				iFocal = (Z.Utils.stringValidate(tempFoc)) ? parseInt(tempFoc, 10) : Z.focal;
				var tempQual = xmlDoc.documentElement.getAttribute('QUALITY');
				iQuality = (Z.Utils.stringValidate(tempQual)) ? parseInt(tempQual, 10) : Z.quality;

				// Optional implementation: Add additional instructions here to receive image server
				// response with necessary image properties. Set values iW and iH, and also tSz if
				// tile size not 256x256 pixels for processing by remaining steps within this function.
			}

			// DEV NOTE: Optional HTML parameter custom tile dimensions override defaults, XML values, or server provided values.
			if (Z.tileW !== null) { tW = Z.tileW; }
			if (Z.tileH !== null) { tH = Z.tileH; }

			// Allow for minimal cross-domain XML and incorrectly edited image folder XML.
			if (Z.tileSource == 'ZoomifyImageFolder' || Z.tileSource == 'IIIFImageServer' || Z.tileSource == 'ImageServer') {
				if (tW === null || isNaN(tW)) { tW = TILE_WIDTH; }
				if (tH === null || isNaN(tH)) { tH = TILE_HEIGHT; }
				if (iTileCount === null || isNaN(iTileCount)) { iTileCount = 1; }
			}
			
			if (!isNaN(iW) && iW > 0 && !isNaN(iH) && iH > 0 && !isNaN(tW) && tW > 0 && !isNaN(tH) && tH > 0 && iTileCount > 0) {
				if (!self.getStatus('initializedViewport')) {
					initializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality, callback);
				} else {
					reinitializeViewport(iW, iH, tW, tH, iTileCount, iVersion, iHeaderSize, iHeaderSizeTotal, iMagnification, iFocal, iQuality, callback);
				}
			} else {
				if (Z.tileSource == 'ZoomifyImageFolder') {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESXMLINVALID'), false, Z.messageDurationStandard, 'center');
				} else {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGEPROPERTIESINVALID'), false, Z.messageDurationStandard, 'center');
				}
			}
		}
	}

	function calculateTierValues () {
		if (Z.tileSource == 'unconverted') {
			calculateTierValuesUnconvertedMethod();
		} else if (Z.tileSource == 'ZoomifyZIFFile') {
			calculateTierValuesZIFMethod();
		} else {
			var tilesCounted = calculateTierValuesSecondMethod();
			if (tilesCounted != TILE_COUNT && (Z.tileSource == 'ZoomifyImageFolder' || Z.tileSource == 'ZoomifyZIFFile' || Z.tileSource == 'ZoomifyPFFFile')) {
				tilesCounted = calculateTierValuesFirstMethod();
				if (tilesCounted != TILE_COUNT) {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGETILECOUNTINVALID'), false, Z.messageDurationStandard, 'center');
				}
			}
		}
	}

	function calculateTierValuesUnconvertedMethod () {
		tierWs[0] = Z.imageW;
		tierHs[0] = Z.imageH;
		tierWInTiles[0] = 1;
		tierHInTiles[0] = 1;
		tierTileCounts[0] = 1;
		tierCount = 1;
		maxTier = 1;
	}

	// ZIF files contain tier width, height, and tile counts.  Values extracted
	// in function parseZIFHeader.  Minimal additional values derived here.
	function calculateTierValuesZIFMethod () {
		for (var t = tierCount - 1; t >= 0; t--) {
			tierWInTiles[t] = Math.ceil(tierWs[t] / TILE_WIDTH);
			tierHInTiles[t] = Math.ceil(tierHs[t] / TILE_HEIGHT);
			tierTileCounts[t] = tierWInTiles[t] * tierHInTiles[t];
		}
		
		// maxTier set with tierCount in function parseZIFHeader.
		maxTileR = tierWInTiles[maxTier] - 1;
		maxTileB = tierHInTiles[maxTier] - 1;
	}

	function calculateTierValuesSecondMethod () {
		// Determine the number of tiers.
		var tempW = Z.imageW;
		var tempH = Z.imageH;
		while (tempW > TILE_WIDTH || tempH > TILE_HEIGHT) {
			tempW = tempW / 2;
			tempH = tempH / 2;
			tierCount++;
		}

		// Determine and record dimensions of each image tier.
		tempW = Z.imageW;
		tempH = Z.imageH;
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
		
		maxTier = tierCount - 1;
		maxTileR = tierWInTiles[maxTier] - 1;
		maxTileB = tierHInTiles[maxTier] - 1;

		// Calculate number of extra thumbnail subfolders (single jpeg) to ignore.
		if (Z.tileSource == 'DZIFolder') {
			var dziThmbW = tierWs[0];
			var dziThmbH = tierHs[0];
			var dziTiersToSkip = 0;
			while (dziThmbW > 1 || dziThmbH > 1) {
				dziThmbW = dziThmbW / 2;
				dziThmbH = dziThmbH / 2;
				dziTiersToSkip++;
			}
			Z.dziSubfoldersToSkip = dziTiersToSkip - 1;
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
		var tempW = Z.imageW;
		var tempH = Z.imageH;
		var divider = 2;
		while (tempW > TILE_WIDTH || tempH > TILE_HEIGHT) {
			if (pyramidType == 'Div2') {
				tempW = Math.floor(tempW / 2);
				tempH = Math.floor(tempH / 2);
			} else if (pyramidType == 'Plus1Div2') {
				tempW = Math.floor((tempW+1) / 2);
				tempH = Math.floor((tempH+1) / 2);
			} else {
				tempW = Math.floor(Z.imageW / divider)
				tempH = Math.floor(Z.imageH / divider);
				divider *= 2;
				if (tempW % 2) { tempW++; }
				if (tempH % 2) { tempH++; }
			}
			tierCount++;
		}
		
		maxTier = tierCount - 1;
		maxTileR = tierWInTiles[maxTier] - 1;
		maxTileB = tierHInTiles[maxTier] - 1;

		// Determine and record dimensions of each image tier.
		tempW = Z.imageW;
		tempH = Z.imageH;
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
				tempW = Math.floor(Z.imageW / divider)
				tempH = Math.floor(Z.imageH / divider);
				divider *= 2;
				if (tempW % 2) { tempW++; }
				if (tempH % 2) { tempH++; }
			}
		}

		// Debug option: console.log('Old method: ' + tileCounter + '  ' + TILE_COUNT);
		return tileCounter;
	}

	this.validateXYZDefaults = function (override) {
		if (override) { Z.Utils.resetParametersXYZ(Z.parameters); }

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
		if (Z.bookmarksGet) {
			if (!Z.initialX) { Z.initialX = niX; }
			if (!Z.initialY) { Z.initialY = niY; }
			if (!Z.initialZ) { Z.initialZ = niZ; }
			if (!Z.initialR) { Z.initialR = niR; }
			if (!Z.minZ) { Z.minZ = nmnZ; }
			if (!Z.maxZ) { Z.maxZ = nmxZ; }

		} else if (Z.tileSource == 'IIIFImageServer') {
			// Calculate center for initial view using IIIF region x and y values.
			if (Z.iiifRegion) {
				var regionValues = Z.iiifRegion.split(',');
				var sizeValues = Z.iiifSize.split(',');
				Z.initialX = Math.round(parseFloat(regionValues[0]) + parseFloat(regionValues[2]) / 2);
				Z.initialY = Math.round(parseFloat(regionValues[1]) + parseFloat(regionValues[3]) / 2);
				Z.initialZ = Math.round((parseFloat(sizeValues[0]) / parseFloat(regionValues[2])) * 100) / 100;
				Z.initialR = parseInt(Z.iiifRotation, 10);
			}

		} else if (!Z.parameters) {
			Z.initialX = niX;
			Z.initialY = niY;
			Z.initialZ = niZ;
			Z.initialR = niR;
			Z.minZ = nmnZ;
			Z.maxZ = nmxZ;

		} else {
			if (!Z.parameters.zInitialX) {  Z.initialX = niX; }
			if (!Z.parameters.zInitialY) {  Z.initialY = niY; }
			if (!Z.parameters.zInitialZoom) {  Z.initialZ = niZ; }
			if (!Z.parameters.zInitialRotation) {  Z.initialR = niR; }
			if (!Z.parameters.zMinZoom) {  Z.minZ = nmnZ; }
			if (!Z.parameters.zMaxZoom) {  Z.maxZ = nmxZ; }
		}

		// Set pan center point as default if required.
		if (Z.initialX === null) { Z.initialX = Z.imageW / 2; }
		if (Z.initialY === null) { Z.initialY = Z.imageH / 2; }

		// Set defaults if required.
		Z.fitZ = self.calculateZoomToFit(null, null, 0);
		Z.fillZ = self.calculateZoomToFill(null, null, 0);
		var currentR = (self.getStatus('initializedViewport')) ? self.getRotation() : Z.initialR;
		var zFitR = self.calculateZoomToFit(null, null, currentR);
		var zFillR = self.calculateZoomToFill(null, null, currentR);

		// Constrain zoom-to-fit and zoom-to-fill to max zoom if set by parameter, or to 1 if viewing unconverted image.
		if (Z.fitZ > 1) {
			if (Z.maxZ !== null) {
				if (Z.fitZ > Z.maxZ) { Z.fitZ = Z.maxZ; }
			} else if (Z.tileSource == 'unconverted') {
				Z.fitZ = 1;
			}
		}
		if (Z.fillZ > 1) {
			if (Z.maxZ !== null) {
				if (Z.fillZ > Z.maxZ) { Z.fillZ = Z.maxZ; }
			} else if (Z.tileSource == 'unconverted') {
				Z.fillZ = 1;
			}
		}

		// Set min and max values if not set by parameter.
		if (Z.minZ === null || Z.minZ == -1) {
			Z.minZ = Z.fitZ;
		} else if (Z.minZ == 0) {
			Z.minZ = Z.fillZ;
		}
		if (Z.maxZ === null || Z.maxZ == -1) { Z.maxZ = 1; }

		// Constrain initial zoom within fit or fill, rotated fit or fill, and min and max zoom.
		if (Z.initialZ === null || Z.initialZ == -1) {
			Z.initialZ = zFitR;
		} else if (Z.initialZ == 0) {
			Z.initialZ = zFillR;
		}
		if (Z.initialZ < Z.minZ) { Z.initialZ = Z.minZ; }
		if (Z.initialZ > Z.maxZ) { Z.initialZ = Z.maxZ; }
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
		var deltaX = parseFloat(cS.left) - displayL;
		var currentZ = self.getZoom(recalc);
		var currentX = imageX - (deltaX / currentZ);
		return currentX;
	}

	this.getY = function (recalc) {
		var deltaY = parseFloat(cS.top) - displayT;
		var currentZ = self.getZoom(recalc);
		var currentY = imageY - (deltaY / currentZ);
		return currentY;
	}

	// Returns decimal value.
	this.getZoom = function (recalc) {
		var tierScaleCurr = tierScale;
		if (recalc) { tierScaleCurr = tierScale * parseFloat(vS.width) / displayW; }
		var currentZ = convertTierScaleToZoom(tierCurrent, tierScaleCurr);
		return currentZ;
	}

	// DEV NOTE: Returns stored value rather than current value. Processing of CSS tranform matrix in development.
	// Needed for general access and for comparison viewing when viewports not sync'd.
	this.getRotation = function (recalc) {
		return Z.imageR;
	}

	this.getCoordinates = function () {
		var currentCoords = new Z.Utils.Point(self.getX(), self.getY());
	}

	this.getCoordinatesBookmark = function (recalc, iiifProtocol) {
		var bookmarkQueryString = '';
		if (iiifProtocol) {
			bookmarkQueryString = '?' + self.getViewCoordinatesIIIFString(recalc, null, 'bookmark');
		} else {
			bookmarkQueryString = '?' + self.getViewCoordinatesString(recalc);
		}
		return bookmarkQueryString;
	}

	this.getViewCoordinatesString = function (recalc) {
		var xStr = 'x=' + Math.round(self.getX(recalc)).toString();
		var yStr = '&y=' + Math.round(self.getY(recalc)).toString();
		var zStr = '&z=' + Math.round(self.getZoom(recalc) * 100).toString();
		var r = Math.round(self.getRotation(recalc));
		var rStr = (r == 0) ? '' : '&r=' + r.toString();
		var coordsString = xStr + yStr + zStr + rStr;
		return coordsString;
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
		return Z.constrainPan;
	}

	this.setConstrainPan = function (value) {
		Z.constrainPan = (value != '0');
		Z.constrainPanLimit = parseInt(value, 10);
		Z.constrainPanStrict = (value == '3');
		if (Z.constrainPan) { self.toggleConstrainPan(true); }
	}

	this.getSmoothPan = function () {
		return Z.smoothPan;
	}

	this.setSmoothPan = function (value) {
		Z.smoothPan = value;
	}

	this.getSmoothPanEasing = function () {
		return Z.smoothPanEasing;
	}

	this.setSmoothPanEasing = function (value) {
		Z.smoothPanEasing = value;
	}

	this.getSmoothPanGlide = function () {
		return Z.smoothPanGlide;
	}

	this.setSmoothPanGlide = function (value) {
		Z.smoothPanGlide = value;
	}

	this.getSmoothZoom = function () {
		return Z.smoothZoom;
	}

	this.setSmoothZoom = function (value) {
		Z.smoothZoom = value;
	}

	this.getSmoothZoomEasing = function () {
		return Z.smoothZoomEasing;
	}

	this.setSmoothZoomEasing = function (value) {
		Z.smoothZoomEasing = value;
	}

	this.getImageMetadataXML = function () {
		return Z.imageMetadataXML;
	}

	this.getHotspotCurrentID = function () {
		return hotspotCurrentID;
	}

	this.getHotspotCurrentIDExternal = function () {
		var currIDInt = self.getHotspotCurrentID();
		currIDExt = hotspots[currIDInt].id;
		return currIDExt;
	}

	this.getHotspots = function () {
		return hotspots;
	}

	this.setHotspots = function (hotsArr) {
		hotspots = hotsArr.slice(0);
	}

	// Support imageSet viewing.
	this.setVisibility = function (visible, useOpacity) {
		visibility(visible, useOpacity);
	}

	// Support imageSet viewing. Default implementation uses element display attribute. 
	// Set useOpacity parameter to true to use element opacity to preserve interactivity, 
	// for example, when needing drag viewport with hidden overlays in place.
	function visibility (visible, useOpacity) {
		if (useOpacity) {
			var opacityValue = (visible) ? 1 : 0;
			if (oversizeDisplay) { Z.Utils.setOpacity(oversizeDisplay, opacityValue); }
			if (viewportContainer) { Z.Utils.setOpacity(viewportContainer, opacityValue); }
		} else {
			var dispValue = (visible) ? 'inline-block' : 'none';
			if (oversizeDisplay && !oS) { oS = oversizeDisplay.style; }
			if (oS) { oS.display = dispValue; }
			if (viewportContainer && !cS) { cS = viewportContainer.style; }
			if (cS) { cS.display = dispValue; }
		}
	}

	// Support overlays. Ensure value is between 0 and 1. If far over 1 assume entered as range 1 to 100 and correct.
	this.setOpacity = function (percentage) {
		percentage = (percentage >= 2) ? (percentage / 100) : (percentage < 0) ? 0 : (percentage > 1) ? 1 : percentage;
		Z.Utils.setOpacity(viewportContainer, percentage);
	}

	this.showLists = function (visible) {
		var visValue = (visible) ? 'visible' : 'hidden';
		if (imageList) {
			self.setImageListVisibilty(visValue);
			if (Z.comparison) { Z.Viewport1.setImageListVisibilty(visValue); }
		}
		if (Z.annotationFileList) { self.setAnnotationFileListVisibilty(visValue); }
		if (Z.hotspots) { Z.Viewer.setVisibilityHotspotChoiceList(visible, viewportID.toString()); }
		if (Z.slideshow) { Z.Viewport.setVisibilitySlidesChoiceList(visible); }
		if (Z.imageSet && !Z.comparison) { Z.Viewer.setVisibilityImageSetChoiceList(visible); }
	}

	this.getLabelList = function () {
		if (typeof labelListDP !== 'undefined') {
			// Clone array or setting array to returned value creates pointer.
			var tempArr = Z.Utils.arrayClone('labels', labelListDP, tempArr);			
			return tempArr;
		}

	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::: CORE FUNCTIONS ::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Precache backfill tiers to ensure fast low-res background. Delay some precaching to speed image set display.
	// Variable tierBackfill is reset during navigation but precached tiles anticipate possible values based on image and viewing type.
	// If navigator visible, precache thumbnail tile to ensure availability on navigator configuration and centralize tile loading code in Viewer.
	this.precacheBackfillTiles = function (delayed) {
		selectBackfillTier();		
		if (!delayed) {
			precacheTierTileNames(backfillChoice0, tilesBackfillCachedNames);
			backfillTresholdCached0 = true;
		}		
		if ((!Z.imageSet || Z.comparison || vpID == Z.imageSetStart || delayed) && tierCount > backfillTreshold1) {
			precacheTierTileNames(backfillChoice1, tilesBackfillCachedNames);
			backfillTresholdCached1 = true;
			if (tierCount > backfillTreshold2) {
				precacheTierTileNames(backfillChoice2, tilesBackfillCachedNames);
				backfillTresholdCached2 = true;
			}
			self.setStatus('backfillPrecachedViewport', true);
		}

		tilesBackfillCachedNames.sort();
		tilesBackfillCachedNames = Z.Utils.arrayUnique(tilesBackfillCachedNames);
		tilesBackfillDisplayingNames = tilesBackfillCachedNames.slice(0);

		self.traceDebugValues('tilesBackfillToPrecache', null, tilesBackfillDisplayingNames.length);
		loadNewTiles(tilesBackfillCachedNames, onTileBackfillLoad, 'simple', 'image-backfill');

		// Trace progress.
		//self.traceDebugValues('tilesBackfillToDisplay', null, tilesBackfillDisplayingNames.length, tilesBackfillDisplayingNames);
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
		if (Z.imageSet) {
			Z.Utils.showMessage(Z.Utils.getResource('ALERT_PRELOADINGIMAGESET-LOADINGTILES'), false, Z.messageDurationLong, 'center');
			self.updateView(true, true);
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ALERT_PRELOADINGONEIMAGE-LOADINGTILES'), false, Z.messageDurationLong, 'center');
			Z.Utils.arrayClear(tilesLoadingNames);
			for (var i = 0, j = tierCount; i < j; i++) {
				var bBox = self.getViewportDisplayBoundingBoxInTiles(i, null, true, true);
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
	this.updateView = function (override, preloading, stopping) {
		if (typeof vpID === 'undefined' || vpID === null) { vpID = 0; }
		// If switching comparison viewports and not sync'd, ensure globals not sync'd.
		if (vpID != Z.viewportCurrentID && !override) {
			var viewportComp = Z['Viewport' + vpID.toString()];
			Z.imageX = viewportComp.getX(true);
			Z.imageY = viewportComp.getY(true);
			Z.imageZ = viewportComp.getZoom(true);
			Z.imageR = viewportComp.getRotation(true);
		}
						
		// Get values to ensure action is needed and for callback validation at completion of function.
		var userInteracting = (Z.mouseIsDown || Z.buttonIsDown || Z.keyIsDown || Z.mouseWheelIsDown);
		var viewZoomed = (tierScale != tierScalePrior || self.getZoom() != Z.imageZ);
		var viewPanned = (parseFloat(cS.left) != displayL || parseFloat(cS.top) != displayT || self.getX() != Z.imageX || self.getY() != Z.imageY);
		var viewFullExiting = Z.fullViewPrior;
		var automatedChange = (Z.animation || Z.slideshowPlaying);
		
		if (viewZoomed || viewPanned || viewFullExiting || (typeof override !== 'undefined' && override && (!userInteracting || automatedChange)) || (typeof preloading !== 'undefined' && preloading) || Z.imageFilters == 'external') {
			// Record prior X, Y, Z, and R values.
			if (!stopping) { recordPriorViewCoordinates(); }

			var changeBuffer = 1; // Update current viewport backfill, and if viewing imageSet, backfill for viewports before and after.
			if (Z.comparison || Z.overlays || !Z.imageSet || !Z.Viewer.getStatus('readyViewer') || (vpID > Z.viewportCurrentID - changeBuffer && vpID < Z.viewportCurrentID + changeBuffer) || preloading) {

				// Recenter position of container of displays and reset any scaling of canvases or
				// tile image elements. This prepares all objects for new content.
				resetDisplays(override);

				// If zooming, change viewport and backfill tiers if necessary.
				var delayClear = false;

				if ((typeof override !== 'undefined' && override) || tierScale != tierScalePrior || self.getZoom() != Z.imageZ || !self.getStatus('initializedViewport') || preloading) {
					selectTier();
					if (Z.tileSource != 'unconverted') {
						selectBackfillTier();
						redisplayCachedTiles(bD, tierBackfill, tilesBackfillCached, 'simple', false, '2. Updating view: changing tier - backfill');
					}
					if (!override && TILES_CACHE_MAX > 0) { delayClear = true; }
				} else {
					self.traceDebugValues('updateView-noChange');
				}

				// If zooming or panning, refill viewport with cached tiles or load new tiles. However, if no new tiles needed and convolution filter applied then tiles
				// have been drawn to temp canvas from cache and must now be filtered as one data object and then drawn to viewport display canvas.
				if (Z.tileSource != 'unconverted' && tierBackfillDynamic) {
					selectTiles(true);
				} else {
					if (oD) { Z.Utils.clearDisplay(oD); }
				}
			}
			if (vpID == Z.viewportCurrentID || Z.comparison || Z.overlays || !Z.imageSet || preloading) {

				if (Z.tileSource != 'unconverted') {
					selectTiles();
					redisplayCachedTiles(vD, tierCurrent, null, 'centerOut', delayClear, '3. Updating view: prior to loading of any new tiles');

				} else if (typeof unconvertedImage !== 'undefined') {
					var x = -Z.imageX;
					var y = -Z.imageY;
					Z.Utils.clearDisplay(vD);
					vCtx.drawImage(unconvertedImage, x, y);

					// No tile loading for unconverted image so signal update completion here.
					self.setStatus('displayLoadedViewport', true);
					self.setStatus('displayDrawnViewport', true);
					Z.Utils.validateCallback('viewUpdateComplete');
					Z.Utils.validateCallback('viewUpdateCompleteGetLabelIDs');
				}

				if (Z.maskingSelection) { updateMask(); }

				if (tilesLoadingNames.length > 0) {
					loadNewTiles(tilesLoadingNames, onTileLoad, 'centerOut', 'image-display');
				}

				// Update related displays and components.
				var comparisonSync = (Z.comparison && vpID == Z.viewportCurrentID);
				var overlaySync = (Z.overlays && vpID == Z.viewportCurrentID);
				var bookmarksSync = Z.bookmarksSet;
				var trackingSync = Z.tracking;
				self.syncViewportRelated(true, true, true, true, true, true, comparisonSync, overlaySync, bookmarksSync, trackingSync);

			} else {
				// Override default false status for viewports other than starting viewport.
				self.setStatus('displayLoadedViewport', true);
				self.setStatus('displayDrawnViewport', true);
			}

			if (preloading) {
				var imageSetLen = (Z.imageSetLength !== null) ? Z.imageSetLength.toString() : '';
				var statusCounterStr = (self.getViewportID() + 1).toString() + ' of ' + imageSetLen;
				Z.Utils.showMessage(Z.Utils.getResource('ALERT_PRELOADINGIMAGESET-UPDATINGVIEW') + '  ' + statusCounterStr, false, Z.messageDurationLong, 'center');
			}

			// Validate all view change callbacks.
			if (viewPanned) { Z.Utils.validateCallback('viewPanned'); }
			if (viewZoomed) { Z.Utils.validateCallback('viewZoomed'); }
			if (viewPanned || viewZoomed) { Z.Utils.validateCallback('viewChanged'); }

			// Debug option: console.log(Z.viewportCurrent.getLabelIDsInCurrentView(true, true, true));
		}
	}

	function resetDisplays (override) {
		// If display scaled or panned, reset scale and position to maintain container center
		// point and adjust current tiles to offset change and fill view while new tiles load.
		var redisplayRequired = false;

		// Test for scaling to reset.
		if (override || parseFloat(vS.width) != vD.width) {

			if (Z.useCanvas) {
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
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_SCALINGCANVASFORUNCONVERTEDIMAGE'));
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
			if (Z.imageR != 0) {
				var deltaPt = Z.Utils.rotatePoint(deltaX, deltaY, Z.imageR);
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
			var currentZ = self.getZoom();
			Z.imageX = imageX = Z.imageX - (deltaX / currentZ);
    			Z.imageY = imageY = Z.imageY - (deltaY / currentZ);

			redisplayRequired = true;
		}

		if (redisplayRequired) {
			redisplayCachedTiles(vD, tierCurrent, tilesCached, 'centerOut', false, '1a. Updating view: resetting display positions');
			if (Z.maskingSelection && mC) { displayMask(); }
			if (tierBackfillDynamic) { redisplayCachedTiles(bD, tierBackfill, tilesBackfillCached, 'simple', false, '1b. Updating view: resetting backfill positions'); }
		}
    	}

	function selectTier () {
		// If tier has been scaled translate scaling to zoom tracking variable.
		if (tierScale != tierScalePrior) { 
			Z.imageZ = self.getZoom();
		}

		// Prevent infinite loop on constraint failure in case of JS timing errors.
		if (Z.imageZ < Z.minZ) { Z.imageZ = Z.minZ; }
		if (Z.imageZ > Z.maxZ) { Z.imageZ = Z.maxZ; }

		// Determine best image tier and scale combination for intended zoom.
		var calcZ = TIERS_SCALE_UP_MAX;
		var tierTarget = tierCount;
		while(tierTarget > 0 && calcZ / 2 >= Z.imageZ) {
			tierTarget--;
			calcZ /= 2;
		}
		tierTarget = (tierTarget - 1 < 0) ? 0 : tierTarget - 1; // Convert to array base 0.
		var tierScaleTarget = convertZoomToTierScale(tierTarget, Z.imageZ);

		// If zooming, apply new tier and scale calculations.  No steps required here for the
		// drawing canvas as its scale does not change, only the control point coordinates do.
		if (tierTarget != tierCurrent || tierScaleTarget != tierScale) {
			if (Z.useCanvas) {
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

		var tierBackfillStr = tierBackfill.toString();
		for (var i = 0, j = tilesBackfillCachedNames.length; i < j; i++) {
			if (tilesBackfillCachedNames[i].substring(0,1) == tierBackfillStr) {
				tilesBackfillDisplayingNames[tilesBackfillDisplayingNames.length] = tilesBackfillCachedNames[i];
			}
		}

		tierBackfillScale = convertZoomToTierScale(tierBackfill, Z.imageZ);
		tierBackfillScalePrior = tierBackfillScale;

		var tierBackfillW = tierWs[tierBackfill];
		var tierBackfillH = tierHs[tierBackfill];

		// Convert current pan position from image values to tier values.
		var deltaX = Z.imageX * Z.imageZ;
		var deltaY = Z.imageY * Z.imageZ;

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
			if (Z.useCanvas) {
				if (oD) {
					tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, Z.imageZ);
					oCtx.restore();
					oCtx.save();
					oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
					if (Z.imageR != 0) {
						oCtx.rotate(Z.imageR * Math.PI / 180);
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
			if (Z.useCanvas) {
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
			var bBox = self.getViewportDisplayBoundingBoxInTiles();

			// Determine tiles in view.
			for (var columnCntr = bBox.l, tR = bBox.r; columnCntr <= tR; columnCntr++) {
				for (var rowCntr = bBox.t, tB = bBox.b; rowCntr <= tB; rowCntr++) {
					var tileName = tierCurrent + '-' + columnCntr + '-' + rowCntr;
					tilesDisplayingNames[tilesDisplayingNames.length] = tileName;
					tilesLoadingNames[tilesLoadingNames.length] = tileName;
				}
			}

			// If current tier matches a precached backfill tier determine cached backfill tiles useful for frontfill and remove from loading list. Backfill tiles also in frontfill will be used in function onTileLoad called by onTileBackfillLoad.
			if (self.getStatus('initializedViewport') && tilesBackfillCached.length > 0 && (tierCurrent == backfillChoice0 || tierCurrent == backfillChoice1 || tierCurrent == backfillChoice2)) {
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
			self.traceDebugValues('tilesToDisplay', null, tilesDisplayingNames.length, tilesDisplayingNames);
			self.traceDebugValues('tilesInCache', null, tilesCachedInViewNames.length, tilesCachedInViewNames);
			self.traceDebugValues('tilesToLoad', null, tilesLoadingNames.length, tilesLoadingNames);

		} else {
			var bBox = self.getViewportDisplayBoundingBoxInTiles(tierBackfill);
			Z.Utils.arrayClear(tilesBackfillCachedNames);
			Z.Utils.arrayClear(tilesBackfillDisplayingNames);
			for (var columnCntr = bBox.l, tR = bBox.r; columnCntr <= tR; columnCntr++) {
				for (var rowCntr = bBox.t, tB = bBox.b; rowCntr <= tB; rowCntr++) {
					var tileName = tierBackfill + '-' + columnCntr + '-' + rowCntr;
					tilesBackfillDisplayingNames[tilesBackfillDisplayingNames.length] = tileName;
					tilesBackfillCachedNames[tilesBackfillCachedNames.length] = tileName;
				}
			}			
			loadNewTiles(tilesBackfillCachedNames, onTileBackfillLoad, 'simple', 'image-backfill');

			// Track progress.
			tilesToLoadTotal = tilesLoadingNames.length;

			// Trace progress.
			self.traceDebugValues('tilesBackfillToDisplay', null, tilesBackfillDisplayingNames.length, tilesBackfillDisplayingNames);
			self.traceDebugValues('tilesBackfillInCache', null, tilesBackfillCachedNames.length, tilesBackfillCachedNames);
		}					
	}

	function redisplayCachedTiles (display, tier, cacheArray, drawMethod, delayClear, purpose) {
		// If using canvas browser, display content of temporary transition canvas while display canvas
		// is updated. In non-canvas browsers, draw directly to display, optionally using
		// center-out order. Clear tiles previously drawn or wait until all tiles load - per parameter.
		if (!delayClear) { Z.Utils.clearDisplay(display); }

		if (drawMethod == 'canvasCopy') {
			Z.Utils.clearDisplay(vD);
			vCtx.restore();
			vCtx.save();
			vCtx.scale(1, 1);
			vCtx.drawImage(tC, -displayCtrX, -displayCtrY);
			vCtx.restore();
			vCtx.save();
			vCtx.scale(tierScale, tierScale);

		} else {
			// Calculate tiles at edges of viewport display for current view.
			var bBox = self.getViewportDisplayBoundingBoxInTiles(tier);
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

				self.traceDebugValues('redisplayCachedTiles-' + display.id, null, null, cacheArrayInView);

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
				self.traceDebugValues('No cached tiles in view');
			}

			self.traceDebugValues('blankLine');
		}
	}

	function displayCacheDisplay (tier, cacheArray) {
		// In canvas browsers avoid blink of visible backfill as canvas is fully cleared
		// and redrawn by first drawing cached tiles from prior view to temp canvas.

		// Calculate tiles at edges of viewport display for current view.
		var bBox = self.getViewportDisplayBoundingBoxInTiles();

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
			self.traceDebugValues('loadNewTiles' + reqValue, null, null, tileNamesArray);

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

			self.traceDebugValues('blankLine');
		} else {
			self.traceDebugValues('loadNewTiles' + reqValue, 'No new tiles requested');
		}
	}

	this.Tile = function (name, requester) {
		return new Tile(name, requester);
	}
	
	function Tile (name, requester) {
		// Enable invalidation of tile requests fulfilled after current image change.
		this.imagePath = Z.imagePath;

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

		this.url = self.formatTilePath(this.t, this.c, this.r, requester);
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
		if (Z.tileSource == 'ZoomifyZIFFile') {
			tilePath = formatTilePathZIF(t, c, r, requester);
		} else if (Z.tileSource == 'ZoomifyImageFolder') {
			tilePath = formatTilePathImageFolder(t, c, r, requester);
		} else if (Z.tileSource == 'ZoomifyPFFFile' && Z.tileHandlerPathFull === null) {
			tilePath = formatTilePathPFF(t, c, r, requester);
		} else if (Z.tileSource == 'ZoomifyPFFFile') {
			tilePath = formatTilePathPFFServlet(t, c, r, requester);
		} else if (Z.tileSource == 'DZIFolder') {
			tilePath = formatTilePathDZI(t, c, r, requester);
		} else if (Z.tileSource == 'IIIFImageServer') {
			tilePath = formatTilePathIIIFImageServer(t, c, r, requester);
		} else if (Z.tileSource == 'ImageServer') {
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
		var vpID = self.getViewportID();
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

				self.traceDebugValues('formatTilePathZIF', offsetValues.chunkID + ',' + t +',' + c +',' + r + ',' + requester);

				if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, offsetTileRetry) == -1) {
					tilesRetryNamesChunks[tilesRetryNamesChunks.length] = offsetTileRetry;
				}
				tierTileOffsetChunks[tierTileOffsetChunks.length] = { chunkID:offsetValues.chunkID, chunk:'loading' };
				var netConnector = new Z.NetConnector();
				netConnector.loadByteRange(imagePath, offsetValues.chunkStart, offsetValues.chunkEnd, 'loadingZIFFileBytes', 'offset', null, offsetValues.chunkID, vpID);

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
					var netConnector = new Z.NetConnector();
					netConnector.loadByteRange(imagePath, byteCountValues.chunkStart, byteCountValues.chunkEnd, 'loadingZIFFileBytes', 'byteCount', null, byteCountValues.chunkID, vpID);

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
		var tilePath = imagePath + '/' + 'TileGroup' + tileGroupNum + '/' + t + '-' + c + '-' + r + "." + Z.tileType;

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
			var subfolderOfTier = (parseInt(t, 10) + Z.dziSubfoldersToSkip + 1).toString();
			returnPath = Z.imagePath + '/' + Z.dziImageSubfolder + '/' + subfolderOfTier + '/' + c + '_' + r + "." + Z.tileType;
		} else {
			returnPath = Z.imagePath + '/' + Z.dziImagePropertiesFilename;
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
		var vpID = self.getViewportID();
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
			self.traceDebugValues('formatTilePathPFF', chunkID + ',' + t +',' + c +',' + r + ',' + requester);
			if (Z.Utils.arrayIndexOf(tilesRetryNamesChunks, chunkRetry) == -1) {
				tilesRetryNamesChunks[tilesRetryNamesChunks.length] = chunkRetry;
			}
			offsetChunks[offsetChunks.length] = { chunkID:chunkID, chunk:'loading' };
			var netConnector = new Z.NetConnector();
			netConnector.loadByteRange(imagePath, chunkStart, chunkEnd, 'loadingPFFFileBytes', 'offset', null, chunkID, vpID);

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

			self.traceDebugValues('formatTilePathPFF', currentOffsetChunk + ',' + t +',' + c +',' + r + ',' + requester);

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
				tilePath = Z.tileHandlerPathFull + "?file=" + imagePath + "&requestType=0&begin=" + sByte.toString() + "&end=" + eByte.toString() + "&vers=" + IMAGE_VERSION.toString() + "&head=" + HEADER_SIZE.toString();
			} else {
				tilePath = 'skipTile:' + t + '-' + c + '-' + r;
			}
		}

		return tilePath;
	}

	function loadOffsetChunk (offsetStartByte, offsetEndByte, chunkID) {
		var vpID = self.getViewportID();
		offsetChunkBegins[offsetStartByte] = chunkID;
		var netConnector = new Z.NetConnector();

		if (Z.tileHandlerPathFull === null) {
			// PFF viewing without servlet.
			netConnector.loadByteRange(Z.imagePath, offsetStartByte, offsetEndByte, 'loadingPFFFileBytes', 'offset', null, chunkID, vpID);

		} else {		
			// Build data request with query string and send.
			var REQUEST_TYPE = 2; // 1 = header, 2 = offset, 0 = tile.
			var imgPathNoDot = imagePath.replace('.', '%2E');  // Required for servlet.
			var offsetChunkPath = Z.tileHandlerPathFull + '?filePath=' + imgPathNoDot + '&requestType=' + REQUEST_TYPE + '&begin=' + offsetStartByte + '&end=' + offsetEndByte;
			netConnector.loadXML(offsetChunkPath, 'loadingPFFChunkServletXML');
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
		//Z.Utils.trace('parseOffsetChunk-begin + replyData + chunk: ' + begin + '  ' + replyData + '  ' + chunk);
		//Z.Utils.trace('parseOffsetChunk-offsetChunks[offsetOfCurrentChunkBegin][0] & [1]: ' + offsetChunks[offsetOfCurrentChunkBegin][0] + ', ' + offsetChunks[offsetOfCurrentChunkBegin][1]);
	}

	function selectTilesRetry (chunkID, type) {
		for(var i = 0, j = tilesRetryNamesChunks.length; i < j; i++) {
			var tilesRetryElements = tilesRetryNamesChunks[i].split(',');
			if (tilesRetryElements[0] == chunkID && tilesRetryElements[5] == type) {
				if (typeof tilesRetryElements[4] !== 'undefined') {
					if (tilesRetryElements[4] == 'image-display') {
						tilesRetryNames[tilesRetryNames.length] = tilesRetryElements[1] + '-' + tilesRetryElements[2] + '-' + tilesRetryElements[3]; // t,c,r
					} else if (tilesRetryElements[4] == 'image-backfill') {
						tilesBackfillRetryNames[tilesBackfillRetryNames.length] = tilesRetryElements[1] + '-' + tilesRetryElements[2] + '-' + tilesRetryElements[3]; // t,c,r
					} else if (tilesRetryElements[4] == 'image-magnifier') {
						tilesMagnifierRetryNames[tilesMagnifierRetryNames.length] = tilesRetryElements[1] + '-' + tilesRetryElements[2] + '-' + tilesRetryElements[3]; // t,c,r
					}
				}
				tilesRetryNamesChunks = Z.Utils.arraySplice(tilesRetryNamesChunks, i, 1);
				i--;
				j--;
			}
		}

		if (tilesRetryNames.length > 0) {
			tilesRetryNames.sort();
			tilesRetryNames = Z.Utils.arrayUnique(tilesRetryNames);
			self.traceDebugValues('selectTilesRetry', tilesRetryNames);
			var loadHandler = (self.getStatus('imageSaving')) ? onTileLoadToSave : onTileLoad;
			loadNewTilesRetry(tilesRetryNames, loadHandler, 'simple', 'image-display');
		}

		if (tilesBackfillRetryNames.length > 0) {
			tilesBackfillRetryNames.sort();
			tilesBackfillRetryNames = Z.Utils.arrayUnique(tilesBackfillRetryNames);
			var loadHandler = (self.getStatus('imageSaving')) ? onTileBackfillLoadToSave : onTileBackfillLoad;
			loadNewTilesRetry(tilesBackfillRetryNames, loadHandler, 'simple', 'image-backfill');
		}

		if (tilesMagnifierRetryNames && tilesMagnifierRetryNames.length > 0) {
			tilesMagnifierRetryNames.sort();
			tilesMagnifierRetryNames = Z.Utils.arrayUnique(tilesMagnifierRetryNames);
			var loadHandler = onTileLoadMagnifier;
			loadNewTilesRetry(tilesMagnifierRetryNames, loadHandler, 'simple', 'image-magnifier');
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
					tile.url = self.formatTilePath(tile.t, tile.c, tile.r, requester);
				} else {
					tile = new Tile(tileName, requester);
				}

				if (tile != null && tile.url.indexOf('NaN') == -1) {
					self.traceDebugValues('loadNewTilesRetry', tile.name + '  ' + tile.url);
					loadTile(tile, loadStart, loadHandler);

				} else if (tile.url.indexOf('NaN') == -1) {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_TILEPATHINVALID-ZIF') + tile.name + '.jpg', false, Z.messageDurationShort, 'center', false);
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
		if (Z.tileSource == 'ZoomifyZIFFile' || Z.tileSource == 'ZoomifyPFFFile') {
			var index2 = Z.Utils.arrayIndexOf(tilesRetryNames, tileName);
			if (index2 != -1) { tilesRetryNames = Z.Utils.arraySplice(tilesRetryNames, index2, 1); }
		}
		tilesInView[tilesInView.length] = tile;
		tilesInViewNames[tilesInViewNames.length] = tileName;
	}

	this.loadTile = function (tile, loadTime, loadHandler) {
		loadTile(tile, loadTime, loadHandler);
	}
	
	// Asynchronously load tile and ensure handler function is called upon loading.
	function loadTile (tile, loadTime, loadHandler) {
		var tileName = tile.name;
		if (tile.url.substr(0, 8) == 'skipTile') {
			skipTile(tile);

		} else if (tile.url == 'offsetLoading') {
			var index = Z.Utils.arrayIndexOfObjectValue(tilesRetry, 'name', tileName);
			if (index == -1) {
				tilesRetry[tilesRetry.length] = tile;
			}
			self.traceDebugValues('loadTileDelayForOffset', tileName);
				
		} else if (tile.url != 'offsetLoading') {
			var tileType;
			if (loadHandler == onTileLoad || (Z.enterpriseParamsEnabled && loadHandler == onTileLoadToSave)) {
				tileType = 'image-display';
			} else if (loadHandler == onTileBackfillLoad || loadHandler == onTileBackfillLoadToSave) {
				tileType = 'image-backfill';
			} else if (loadHandler == onTileLoadMagnifier) {
				tileType = 'image-magnifier';
			}
			
			// Load tile unless it is for frontfill but already loaded for backfill.
			var tilesCachedForBackfill = ((tile.t == backfillChoice0 && backfillTresholdCached0) || (tile.t == backfillChoice1 && backfillTresholdCached1) || (tile.t == backfillChoice2 && backfillTresholdCached2));
			if (!(tileType == 'image-display' && tilesCachedForBackfill)) {
				tile.loadTime = loadTime;
				self.traceDebugValues('loadTile-' + tileType, tileName);				
				var vpID = self.getViewportID();
				tileNetConnector.loadImage(tile.url, Z.Utils.createCallback(null, loadHandler, tile), 'loadingImageTile', tileType, tile, vpID);

				// DEV NOTE: This value returned by function for possible future storage and use (currently used when loading hotspot media).
				//tile.loading = tileNetConnector.loadImage(tile.url, Z.Utils.createCallback(null, loadHandler, tile), 'loadingImageTile', tileType, tile, vpID);
			}
		}
	}

	// Get image thumbnail tile precached by Viewport.
	this.getNavigatorImage = function () {
		var index = 0, navImage = null;
		if (tilesBackfillCached.length > 0 && tilesBackfillCached[0].name != '0-0-0') {
			index = Z.Utils.arrayIndexOfObjectValue(tilesBackfillCached, 'name', '0-0-0');
		}
		if (index != -1) {
			var navImageTile = tilesBackfillCached[index];
			if (navImageTile) { navImage = navImageTile.image; }
		}
		return navImage;
	}

	function onTileLoad (tile, image) {
		if (tile && image && tile.imagePath == Z.imagePath) {  // Verify tile and image are not null and current image hasn't changed during request fulfillment.
			tile.image = image;
			var tileName = tile.name;
			
			// Verify loading tile is still in loading list and thus still required.  Allows for loading delays due to network latency or ZIF/PFF header chunk loading.
			var index = Z.Utils.arrayIndexOf(tilesLoadingNames, tileName);
			if (index != -1) {

				tilesLoadingNames = Z.Utils.arraySplice(tilesLoadingNames, index, 1);
				cacheTile(tile);

				// Stop here if preloading tiles from non-current tiers so tile is cached but not drawn.
				if (Z.preloadVisible && !Z.imageSet && tile.t != tierCurrent) {
					Z.Utils.showMessage(Z.Utils.getResource('ALERT_PRELOADING-STORINGORDRAWINGTILES') + '   Tile: ' + tileName, false, Z.messageDurationShort / 10, 'center');
					tile.alpha = 1;
					return;
				}

				// Also create current view tile collection for faster zoomAndPanToView function.
				if (Z.Utils.arrayIndexOf(tilesInViewNames, tileName) == -1) {
					tilesInViewNames[tilesInViewNames.length] = tileName;
					tilesInView[tilesInView.length] = tile;
				}

				// If preloading other Viewports for image set show message.
				if (Z.preloadVisible && Z.imageSet && self.getViewportID() != Z.viewportCurrentID) {
					var statusCounterStr = (self.getViewportID() + 1).toString() + ' of ' + Z.imageSetLength.toString()
					var viewportAndTile = statusCounterStr + '   Tile: ' + tileName;
					Z.Utils.showMessage(Z.Utils.getResource('ALERT_PRELOADING-STORINGORDRAWINGTILES') + viewportAndTile, false, Z.messageDurationShort / 10, 'center');
				}

				// Draw tile with fade-in.
				if (!fadeInInterval) { fadeInInterval = window.setInterval(fadeInIntervalHandler, 50); }

				// Determine if all new tiles have loaded.
				tilesLoadingNamesLength = tilesLoadingNames.length;
				if (tilesLoadingNamesLength == 0) {

					// Fully clear and redraw viewport display if canvas in use. If using canvas browser,
					// display temporary transition canvas while display canvas is updated.
					if (Z.useCanvas && (TILES_CACHE_MAX > 0)) {
						if (!tierChanged) {
							redisplayCachedTiles(vD, tierCurrent, tilesCached, 'centerOut', false, '4. Updating view: all new tiles loaded');
						} else {
							displayCacheDisplay(tierCurrent, tilesCached);
							redisplayCachedTiles(vD, tierCurrent, tilesCached, 'canvasCopy', false, '4. Updating view: all new tiles loaded');
							var transitionTimer = window.setTimeout( function () { Z.Utils.clearDisplay(tC); }, 200);
							tierChanged = false;
						}
					}

					// Verify tiles cached in loaded list are under allowed maximum.
					validateCache();

					// Update value for toolbar progress display.
					tilesToLoadTotal = 0;
				}

				// Validate view update progress, and debugging display data.
				self.traceDebugValues('onTileLoad', tile.name, tile.loadTime);
				self.updateProgress(tilesToLoadTotal, tilesLoadingNamesLength); // Update loading tracking variable and also progress display if enabled.
			}

			// Validate loading status.
			if (tilesToDisplay == tilesInCache + tilesLoaded) { self.setStatus('displayLoadedViewport', true); }

		} else if (typeof image === 'undefined' || image === null) {
			if (Z.mobileDevice) {
				console.log(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
			} else {
				console.log(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
			}
		}
	}

	function onTileBackfillLoad (tile, image) {
		if (tile && image && tile.imagePath == Z.imagePath) {  // Verify tile and image are not null and current image hasn't changed during request fulfillment.
			tile.image = image;
			var tileName = tile.name;

			// Cache tile and move tile name from loading list to loaded list.
			tilesBackfillCached[tilesBackfillCached.length] = tile;
			var index = Z.Utils.arrayIndexOf(tilesBackfillCachedNames, tileName);
			if (index != -1) { tilesBackfillCachedNames = Z.Utils.arraySplice(tilesBackfillCachedNames, index, 1); }
			if (Z.tileSource == 'ZoomifyZIFFile' || Z.tileSource == 'ZoomifyPFFFile') {
				var index2 = Z.Utils.arrayIndexOf(tilesBackfillRetryNames, tileName);
				if (index2 != -1) { tilesBackfillRetryNames = Z.Utils.arraySplice(tilesBackfillRetryNames, index2, 1); }
			}

			// Alternative implementation: If preloading show message using same conditions as function onTileLoad except compare tile.t != tierBackfill for non-imageSet case.

			// No backfill fade-in necessary. Tiles precached and load behind main display or outside view area.
			tile.alpha = 1;

			// Draw tile if in current backfill tier, otherwise it will be drawn from cache when needed.
			if (tile.t == tierBackfill ) { displayTile(bD, tierBackfill, tile); }

			// Validate loading status, view update, progress, and debugging display data, and notify navigator that thumbnail tile is loaded.
			self.traceDebugValues('onTileBackfillPrecache', tile.name);
			if (tilesBackfillToPrecache == tilesBackfillToPrecacheLoaded) {
				self.setStatus('precacheLoadedViewport', true);
				if (Z.navigatorVisible > 0) {	
					var targetNavCallback = (!Z.comparison || viewportID == 0) ? 'navigatorTileLoaded' : 'navigator2TileLoaded';
					Z.Utils.validateCallback(targetNavCallback);
				}				
			}
			self.traceDebugValues('onTileLoadBackfill', tile.name);
			if (tilesBackfillToDisplay <= tilesBackfillInCache + tilesBackfillLoaded) { self.setStatus('backfillLoadedViewport', true); }

			// If tile is also present in frontfill pass to handler for caching, tracking, filtering, and display.
			if (tile.t == tierCurrent) { onTileLoad(tile, image); }

		} else if (typeof image === 'undefined' || image === null) {
			if (Z.mobileDevice) {
				console.log(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
			} else {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
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
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_TILEPATHINVALID') + tile.name + '.jpg');
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

				if (Z.fadeIn && fadeInStep != 0 && (tile.alpha + fadeInStep) < 1) {
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

			tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, self.getZoom());
			var override = (tierBackfillOversizeScale > 8); // Slider snap or mousewheel can create need for oversize backfill before selectTier resets tierBackfillDynamic = true.
			if (Z.useCanvas) {
				if (display == vD || display == tC || (display == bD && tierBackfillDynamic)) {
					x -= (Z.imageX * tierCurrentZoomUnscaled);
					y -= (Z.imageY * tierCurrentZoomUnscaled);
				} else if (display == oD && (tierBackfillDynamic  || override)) {
					var newVPImgCtrPt = self.calculateCurrentCenterCoordinates();
					x -= (newVPImgCtrPt.x * tierCurrentZoomUnscaled);
					y -= (newVPImgCtrPt.y * tierCurrentZoomUnscaled);
				}
				drawTileOnCanvas(display, tile, x, y);

			} else {
				var scale;
				if (display == vD) {
					x -= ((Z.imageX * tierCurrentZoomUnscaled) - (displayCtrX / tierScale));
					y -= ((Z.imageY * tierCurrentZoomUnscaled) - (displayCtrY / tierScale));
					scale = tierScale;
				} else {
					scale = tierBackfillScale;
				}
				drawTileInHTML(display, tile, x, y, scale);
			}

			// Validate drawing status, view update, progress, and debugging display data.
			if (display == vD) {
				self.traceDebugValues('displayTile', tile.name);
				if (tilesToDisplay == tilesDisplayed) { self.setStatus('displayDrawnViewport', true); }
			} else {
				self.traceDebugValues('displayTileBackfill', tile.name);
				if (tilesBackfillToDisplay <= tilesBackfillDisplayed) { self.setStatus('backfillDrawnViewport', true); }
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

		containerCtx.drawImage(tile.image, x, y);

		if (Z.alphaSupported && tile.alpha < 1 && container.id != 'transitionCanvas' && (container.id.indexOf('oversizeDisplay') == -1) && container.id != 'savingDisplay' && !imageFilterStatesConvolve) {
			containerCtx.globalAlpha = 1;
		}

		// If in debug mode 2, add tile name to tile.
		if (Z.debug == 2 || Z.debug == 4) { drawTileNameOnTile(container, tile.name, x, y, tierScale); }
	}

	function drawTileInHTML (container, tile, x, y, scale) {
		if (!tile.elmt) {
			// Simple conditional above is OK because tile.elmt will not be numeric and thus not 0.
			tile.elmt = Z.Utils.createContainerElement('img');
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
		if (Z.debug == 2 || Z.debug == 4) { drawTileNameOnTile(container, tile.name, x, y, scale); }
	}

	function drawTileNameOnTile (container, tileName, x, y, scale) {
		if (Z.useCanvas) {
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
		var tileNameTextBox = Z.Utils.createContainerElement('div', 'tileNameTextBox', 'inline-block', 'absolute', 'hidden', 'auto', 'auto', '1px', '1px', 'none', '0px', 'transparent', '0px', padding + 'px', 'nowrap');
		var tileNameTextNode = document.createTextNode(tileName);
		tileNameTextBox.appendChild(tileNameTextNode);
		container.appendChild(tileNameTextBox);
		Z.Utils.setTextNodeStyle(tileNameTextNode, 'white', 'verdana', constrainedFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'center', 'none');

		// Draw tile name black.
		var tileNameTextBox2 = Z.Utils.createContainerElement('div', 'tileNameTextBox2', 'inline-block', 'absolute', 'hidden', 'auto', 'auto', '1px', '1px', 'none', '0px', 'transparent', '0px', padding + 'px', 'nowrap');
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
				zoom = self.getZoom();
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
				var viewportClickPt = self.convertPageCoordsToViewportCoords(mPt.x, mPt.y);
				imageClickPt = self.convertViewportCoordsToImageCoords(viewportClickPt.x, viewportClickPt.y, zoom);
			}
		}
		return imageClickPt;
	}

	function getClickZoomCoords3DAsString (event) {
		var event = Z.Utils.event(event);
		var zVal = self.getZoom();
		var clickPt = self.getClickCoordsInImage(event, zVal);
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
		var viewportClickPt = self.convertPageCoordsToViewportCoords(pageClickPt.x, pageClickPt.y);
		var imageClickPt = self.convertViewportCoordsToImageCoords(viewportClickPt.x, viewportClickPt.y, Z.imageZ);
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
				} else if (Z.maxZ > 1) {
					targetZ = Z.maxZ; // Special case: one click-zoom to max zoom > 100%.
				}

			} else {
				// Zoom-in to max zoom.
				targetZ = Z.maxZ;
			}

		} else{
			// Zoom-out.
			if (!isAltKey) {
				// Scale current tier to zoom-to-fit, or current tier to 1, or prior tier to 1.
				var zFitScale = convertZoomToTierScale(tCurrent, Z.fitZ);

				if (tScale - zFitScale < tierSkipThreshold) {
					targetZ = Z.fitZ;
				} else if (tScale > 1 + tierSkipThreshold) {
					targetZ = convertTierScaleToZoom(tCurrent, 1);
				} else if (tCurrent > 0) {
					targetZ = convertTierScaleToZoom(tCurrent - 1, 1);
				} else if (Z.tileSource == 'unconverted') {
					targetZ = Z.fitZ;
				}

			} else {
				// Zoom-out to zoom-to-fit.
				targetZ = Z.fitZ;
			}
		}

		return new Z.Utils.Point3D(imageClickPt.x, imageClickPt.y, targetZ);
	}
	
	// Get tilename under cursor or at center of view if no mouse.
	this.getTileNameUnderCursor = function (event) {
		var mPt = (event) ? Z.Utils.getMousePosition(event) : new Z.Utils.Point(self.getX(), self.getY());
		var viewportPt = self.convertPageCoordsToViewportCoords(mPt.x, mPt.y);
		var imagePt = self.convertViewportCoordsToImageCoords(viewportPt.x, viewportPt.y, self.getZoom());
		var ctrX = Math.round(imagePt.x);
		var ctrY = Math.round(imagePt.y);
		var tileCol =Math.min(maxTileR, Math.max(0, Math.floor(ctrX / TILE_WIDTH)));
		var tileRow = Math.min(maxTileB, Math.max(0, Math.floor(ctrY / TILE_HEIGHT)));
		return maxTier + '-' + tileCol + '-' + tileRow;
	}
	
	this.calculateCurrentCenterCoordinates = function (viewportPt, z, r) {
		if (typeof viewportPt === 'undefined' || viewportPt === null) { var viewportPt = new Z.Utils.Point(parseFloat(cS.left), parseFloat(cS.top)); }
		if (typeof r === 'undefined' || r === null) { r = self.getRotation(); }
		if (r < 0) { r += 360; } // Ensure positive values.
		if (typeof z === 'undefined' || z === null) { z = self.getZoom(); }

		var currentX = Math.round(Z.imageX - ((viewportPt.x - displayL) / z));
		var currentY = Math.round(Z.imageY - ((viewportPt.y - displayT) / z));
		var currentPtRotated = Z.Utils.getPositionRotated(currentX, currentY, Z.imageX, Z.imageY, -r);

		return new Z.Utils.Point(currentPtRotated.x, currentPtRotated.y);
	}

	// Get bounding box in image tiles for current view. Use tier parameter to current or backfill tier.
	// Use parameter viewportOnly to narrow bounds to view area, excluding pan buffer.
	// Use parameter viewCenterOnly to narrow bounds to view area as-if zoomed in to specified tier - used for preloading feature.
	this.getViewportDisplayBoundingBoxInTiles = function (tier, viewportOnly, viewCenterOnly, partials) {
		if (typeof tier === 'undefined' || tier === null) { tier = tierCurrent; }
		if (typeof viewportOnly === 'undefined' || viewportOnly === null) { viewportOnly = false; }
		var viewCenterTier = (viewCenterOnly) ? tier : null;
		return new BoundingBoxInTiles(self.getViewportDisplayBoundingBoxInPixels(viewportOnly, viewCenterTier, partials), tier);
	}

	// Get bounding box coordinates in image pixels for current view plus pan buffer border area.
	this.getViewportDisplayBoundingBoxInPixels = function (viewportOnly, vTier, partials) {

		// Allow for pan in progress via movement of display.
		var canvasOffsetL = parseFloat(cS.left) - displayL;
		var canvasOffsetT = parseFloat(cS.top) - displayT;

		// Allow for CSS scaling calculations.
		if (Z.useCanvas) {
			var cssScale = parseFloat(cS.width) / cD.width;
			canvasOffsetL /= cssScale;
			canvasOffsetT /= cssScale;
		}

		// Convert offset pixels of any pan in progress to image pixels.
		var currentZ = self.getZoom();
		if (canvasOffsetL != 0) { canvasOffsetL /= currentZ; }
		if (canvasOffsetT != 0) { canvasOffsetT /= currentZ; }

		// Calculate center point and adjust for rotation.
		var ctrX = Z.imageX - canvasOffsetL;
		var ctrY = Z.imageY - canvasOffsetT;
		
		// Calculate pixel bounding box distances.
		var w = (viewportOnly) ? viewW : displayW;
		var h = (viewportOnly) ? viewH : displayH;
		var ctrToLeft = -(w / 2);
		var ctrToRight = (w / 2);
		var ctrToTop = -(h / 2);
		var ctrToBottom = (h / 2);		
		
		return new BoundingBoxInPixels(ctrX, ctrY, ctrToLeft, ctrToRight, ctrToTop, ctrToBottom, currentZ, vTier, partials);
	}

	this.HotspotsAllBoundingBoxInPixels = function () {
		// Find smallest and largest values, and related hotspots indices.
		var hC = new HotspotContext();
		var smallestX = Z.imageCtrX;
		var largestX = Z.imageCtrX;
		var smallestY = Z.imageCtrY;
		var largestY = Z.imageCtrY;

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

		// Set bounding box values.
		this.l = viewTileL;
		this.r = viewTileR;
		this.t = viewTileT;
		this.b = viewTileB;
	}

	function BoundingBoxInPixels (x, y, vpPixelsLeft, vpPixelsRight, vpPixelsTop, vpPixelsBottom, zoom, vTier, partials) {
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
		var viewportPt = self.convertPageCoordsToViewportCoords(pagePixelX, pagePixelY);
		var vpdPixelX = viewportPt.x - displayL;
		var vpdPixelY = viewportPt.y - displayT;
		return new Z.Utils.Point(vpdPixelX, vpdPixelY);
	}

	// Returns coordinates within web page using coordinates in display object including visible display area and out of view pan buffer area.
	this.convertViewportDisplayCoordsToPageCoords = function (vpdPixelX, vpdPixelY) {
		var vpPixelX = vpdPixelX + displayL;
		var vpPixelY = vpdPixelY + displayT;
		var pagePixelPt = self.convertViewportCoordsToPageCoords(vpPixelX, vpPixelY);
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
		var viewportPt = self.convertPageCoordsToViewportCoords(pagePixelX, pagePixelY);
		var imagePixelPt = self.convertViewportCoordsToImageCoords(viewportPt.x, viewportPt.y, Z.imageZ);
		return new Z.Utils.Point(imagePixelPt.x, imagePixelPt.y);
	}

	this.convertImageCoordsToPageCoords = function (imageX, imageY, z, r) {
		var viewportPt = self.convertImageCoordsToViewportCoords(imageX, imageY, z, r);
		var pagePixelPt = self.convertViewportCoordsToPageCoords(viewportPt.x, viewportPt.y, Z.imageZ);
		return new Z.Utils.Point(pagePixelPt.x, pagePixelPt.y);
	}

	this.convertViewportCoordsToImageCoords = function (viewportX, viewportY, z, r) {
		if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.

		// Calculate current viewport center.
		var viewportCtrX = parseFloat(cS.left) + displayCtrX;
		var viewportCtrY = parseFloat(cS.top) + displayCtrY;

		// Calculate delta of input values from viewport center.
		var viewportDeltaX = viewportX - viewportCtrX;
		var viewportDeltaY = viewportY - viewportCtrY;

		// Correct coordinates for freehand drawing and polygon editing.
		if (Z.imageR != 0) {
			viewportClickPt = Z.Utils.rotatePoint(viewportDeltaX, viewportDeltaY, r);
			viewportDeltaX = viewportClickPt.x;
			viewportDeltaY = viewportClickPt.y;
		}

		// Scale delta to convert from viewport to image coordinates.
		var imageDeltaX = viewportDeltaX / z;
		var imageDeltaY = viewportDeltaY / z;

		// Combine with current image position to get image coordinates.
		var imageX = imageDeltaX + Z.imageX;
		var imageY = imageDeltaY + Z.imageY;

		return new Z.Utils.Point(imageX, imageY);
	}

	this.convertImageCoordsToViewportCoords = function (imageX, imageY, z, r) {
		if (imageX == 'center' || isNaN(parseFloat(imageX))) { imageX = Z.imageCtrX; }
		if (imageY == 'center' || isNaN(parseFloat(imageY))) { imageY = Z.imageCtrY; }
		if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.

		// Calculate delta of input values from current image position.
		var imageDeltaX = imageX - Z.imageX ;
		var imageDeltaY = imageY - Z.imageY;

		// Scale delta to convert from image to viewport coordinates.
		var viewportDeltaX = imageDeltaX * z;
		var viewportDeltaY = imageDeltaY * z;

		// Correct coordinates for click-zoom, alt-click-zoom, and click-pan.
		if (Z.imageR != 0) {
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
		if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.

		// Calculate delta of input values from current image position.
		var imageDeltaX = Z.imageX - imageX;
		var imageDeltaY = Z.imageY - imageY;

		// Scale delta to convert from image to viewport coordinates.
		var viewportDeltaX = imageDeltaX * z;
		var viewportDeltaY = imageDeltaY * z;

		// Correct coordinates for click-zoom, alt-click-zoom, and click-pan.
		if (Z.imageR != 0) {
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
		if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.

		// Convert display current to viewport target.
		var viewportDeltaX = displayTargetL - displayL;
		var viewportDeltaY = displayTargetT - displayT;

		// Correct coordinates for click-zoom, alt-click-zoom, and click-pan.
		if (Z.imageR != 0) {
			viewportClickPt = Z.Utils.rotatePoint(viewportDeltaX, viewportDeltaY, -r);
			viewportDeltaX = viewportClickPt.x;
			viewportDeltaY = viewportClickPt.y;
		}

		// Scale delta to convert from image to viewport coordinates.
		var imageDeltaX = viewportDeltaX / z;
		var imageDeltaY = viewportDeltaY / z;

		// Calculate delta of input values from current image position.
		var imageX = Z.imageX - imageDeltaX;
		var imageY = Z.imageY - imageDeltaY;

		return new Z.Utils.Point(imageX, imageY);
	}

	this.calculateZoomToFit = function (w, h, targetR) {
		// Determine zoom to fit the entire image in the viewport. This may leave empty space on the sides or on the top and bottom, depending on the aspect ratios of the image and the viewport.

		// If w and h for rectangle not provided, use image dimensions.
		if (typeof w === 'undefined' || w === null) { w = Z.imageW; }
		if (typeof h === 'undefined' || h === null) { h = Z.imageH; }

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
		// Determine zoom to fill the viewport and leave no empty space on the sides or top and bottom, regardless of the aspect ratios of the image and the viewport.

		// If w and h for rectangle not provided, use image dimensions.
		if (typeof w === 'undefined' || w === null) { w = Z.imageW; }
		if (typeof h === 'undefined' || h === null) { h = Z.imageH; }

		var zoomToFillValue = (w / h > viewW / viewH) ? viewH / h : viewW / w;
		if (targetR == 90 || targetR == 270) {
			zoomToFillValue = (w / h > viewW / viewH) ? viewH / w : viewW / h;
		}

		return zoomToFillValue;
	}

	this.calculateZoomForResize = function (currZ, priorViewW, priorViewH, newViewW, newViewH) {
		var newZ = currZ;
		var currImgW = Z.imageW * currZ;
		var currImgH = Z.imageH * currZ;
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

		if (newZ < Z.minZ) { newZ = Z.minZ; }
		if (newZ > Z.maxZ) { newZ = Z.maxZ; }

		// Debug option: console.log(priorViewW, newViewW, priorViewH, newViewH, deltaZ, z, newZ);

		return newZ;
	}

	this.convertTierScaleToZoom = function (tier, scale) {
		var zoom = convertTierScaleToZoom(tier, scale);
		return zoom;
	}

	function convertTierScaleToZoom (tier, scale) {
		var zoom = scale * (tierWs[tier] / Z.imageW);
		return zoom;
	}

	function convertZoomToTierScale (tier, zoom) {
		var scale = zoom / (tierWs[tier] / Z.imageW);
		return scale;
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::: CONSTRAIN & SYNC FUNCTIONS :::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	function constrainPan (x, y, z, r, input) {
		// Limit target pan coordinates (view, setView, zoomAndPanToView) or new
		// display container position (mouse, touch, navigator, key, slider-zoom).
		
		//DEV NOTE: Modification in progress for pan constraint with rotation.
		if (Z.constrainPan && r == 0) {
			// Validate and record input values.
			var z = (typeof z !== 'undefined' && z !== null) ? z : Z.imageZ;
			var r = (typeof r !== 'undefined' && r !== null) ? Math.round(r) : Math.round(Z.imageR);
			if (r < 0) { r += 360; } // Ensure positive values.
			var unconstrainedX = x, unconstrainedY = y;

			if (input == 'image') {
				// Convert image pixel values to viewport values.
				var newPt = self.convertImageCoordsToViewportEdgeCoords(x, y, z, r);
				x = newPt.x;
				y = newPt.y;
			}

			// Abbreviate input values.
			var iW = Z.imageW;
			var iH = Z.imageH;
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
			currX = (vCtrX - displayL) + (Z.imageCtrX - Z.imageX) * z + x;
			currY = (vCtrY - displayT) + (Z.imageCtrY - Z.imageY) * z + y;

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
			var imgPtULRot = Z.Utils.getPositionRotated(imgULX, imgULY, currX, currY, r);
			var imgPtURRot = Z.Utils.getPositionRotated(imgURX, imgURY, currX, currY, r);
			var imgPtBRRot = Z.Utils.getPositionRotated(imgBRX, imgBRY, currX, currY, r);
			var imgPtBLRot = Z.Utils.getPositionRotated(imgBLX, imgBLY, currX, currY, r);

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
			if (zoomedInHorizontal || !Z.constrainPanStrict) {
				if (Z.constrainPanLimit == 3) { // Strict.
					x = (imgRotL > 0) ? x - imgRotL : (imgRotR < vW) ? x - (imgRotR - vW) : x;
				} else if (Z.constrainPanLimit == 2) { // Relaxed (default).
					x = (imgRotL > vCtrX) ? x - (imgRotL - vCtrX) : (imgRotR < vCtrX) ? x - (imgRotR - vCtrX) : x;
				} else if (Z.constrainPanLimit == 1) { // Loose.
					x = (imgRotL > vEdgeX * 9) ? x - (imgRotL - vEdgeX * 9) : (imgRotR < vEdgeX) ? x - (imgRotR - vEdgeX) : x;
				}
			} else {
				x = (imgRotL > (vCtrX - iWz / 2)) ? x - (imgRotL - (vCtrX - iWz / 2)) : (imgRotR < vCtrX + iWz / 2) ? x - (imgRotR - (vCtrX + iWz / 2)) : x;
			}
			if (zoomedInVertical || !Z.constrainPanStrict) {
				if (Z.constrainPanLimit == 3) { // Strict.
					y = (imgRotT > 0) ? y - imgRotT : (imgRotB < vH) ? y - (imgRotB - vH) : y;
				} else if (Z.constrainPanLimit == 2) { // Relaxed (default).
					y = (imgRotT > vCtrY) ? y - (imgRotT - vCtrY) : (imgRotB < vCtrY) ? y - (imgRotB - vCtrY) : y;
				} else if (Z.constrainPanLimit == 1) { // Loose.
					y = (imgRotT > vEdgeY * 9) ? y - (imgRotT - vEdgeY * 9) : (imgRotB < vEdgeY) ? y - (imgRotB - vEdgeY) : y;
				}
			} else {
				y = (imgRotT > (vCtrY - iHz / 2)) ? y - (imgRotT - (vCtrY - iHz / 2)) : (imgRotB < vCtrY + iHz / 2) ? y - (imgRotB - (vCtrY + iHz / 2)) : y;
			}

			if (input == 'image') {
				// Convert viewport values to image pixel values.
				var newPt = self.convertViewportEdgeCoordsToImageCoords(x, y, z, r);
				x = newPt.x;
				y = newPt.y;
			}

			// Validate pan constraint callback.
			if (x != unconstrainedX || y != unconstrainedY) {
				x = Math.round(x);
				y = Math.round(y);
				Z.Utils.validateCallback('panConstrained');
			}
		}

		return new Z.Utils.Point(x, y);
	}

	// Ensure image is not zoomed beyond specified min and max values.
	function constrainZoom (z) {
		if (z > Z.maxZ) {
			z = Z.maxZ;
			Z.Utils.validateCallback('zoomConstrainedMax');
		} else if (z < Z.minZ) {
			z = Z.minZ;
			Z.Utils.validateCallback('zoomConstrainedMin');
		}
		return z;
	}

	function constrainRotation (targetR) {
		// Constrain to integer values in increments of 90 or -90 degrees.
		if (!Z.rotationFree) {
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
		if (Z.Toolbar && Z.ToolbarDisplay && Z.Toolbar.getInitialized()) {
			var currentZ = self.getZoom();
			Z.Toolbar.syncSliderToViewportZoom(currentZ);
		}
		Z.Utils.validateCallback('viewZoomingGetCurrentZoom');
	}

	function syncNavigatorToViewport () {
		// Set navigator rectangle size and position.
		if (!Z.comparison || viewportID == 0) {
			if (Z.Navigator) { Z.Navigator.syncToViewport(); }
		} else {
			if (Z.Navigator2) { Z.Navigator2.syncToViewport(); }
		}
	}

	function syncRulerToViewport () {
		// Set ruler scale bar text.
		if (Z.Ruler && Z.Ruler.getInitialized()) {
			Z.Ruler.syncToViewport();
		}
	}

	this.syncViewportToNavigator = function (newVPImgCtrPt) {
		var r = Z.imageR;
		if (r < 0) { r += 360; } // Ensure positive values.
		var constrainedPt = constrainPan(newVPImgCtrPt.x, newVPImgCtrPt.y, Z.imageZ, r, 'image');
		var zX = Z.imageX;
		var zY = Z.imageY;
		
		//DEV NOTE: Modification in progress for pan constraint with rotation.
		if (r == 0) {
			var nX = constrainedPt.x;
			var nY = constrainedPt.y;
		} else {
			var nX = newVPImgCtrPt.x;
			var nY = newVPImgCtrPt.y;
		}

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
		var deltaX = rdX * Z.imageZ;
		var deltaY = rdY * Z.imageZ;
		var newX = deltaX + displayL;
		var newY = deltaY + displayT;

		// Sync viewport display to navigator rectangle.
		cS.left = newX + 'px';
		cS.top = newY + 'px';

		if (oD && tierBackfillDynamic && (Z.mobileDevice || (Math.abs(deltaX) > (viewW / 2) || Math.abs(deltaY) > (viewH / 2)))) {
			redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
		}

		// Sync comparison and overlay viewports.
		Z.Viewer.syncComparisonViewport();
		Z.Viewer.syncOverlayViewports(null, vpID);
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
		var index = Z.Utils.arrayIndexOfObjectValue(viewportStatus, 'state', vState);
		var statusVal = (index == -1) ? false : viewportStatus[index].status;
		return statusVal;
	}

	this.setStatus = function (vState, vStatus) {
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
			Z.Utils.validateCallback(vState);
			Z.Viewer.validateViewerStatus(vState);
		}
	}

	// Display debug information if parameter set. DEV NOTE: modification in progress to use viewportStatus values.
	this.traceDebugValues = function (step, infoTxt, infoNum, dataArr) {
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
			case 'displayTileBackfill' :
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
		if (Z.debug == 2 || Z.debug == 3) {
			Z.Utils.traceTileStatus(tilesToDisplay, tilesInCache, tilesRequested, tilesLoaded, tilesDisplayed, tilesWaiting);
		}

		// Debug options: Use zDebug=2 parameter to display messages below at appropriate steps during view updating.
		if (Z.debug == 2) {
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

			if (traceText != '') { Z.Utils.trace(traceText, blankLineBefore, blankLineAfter); }
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
		if (Z.debug == 2 || Z.debug == 3) {
			Z.Utils.trace('View validation-time elapsed: ' + tilesTimeElapsed);
			if (tilesWaiting > 0) {
				if (loadingDelay) {
					Z.Utils.trace('Loading delay - re-calling updateView');
				} else if (displayDelay) {
					Z.Utils.trace('Display delay - re-calling updateView');
				} else {
					Z.Utils.trace('Progress slow, resetting timer');
				}
			}
			Z.Utils.trace('');
			Z.traces.scrollTop = Z.traces.scrollHeight;
			Z.Utils.traceTileSpeed(tilesTimeElapsed, tileLoadsPerSecond);
		}

		// Validate speed values.
		if (tilesWaiting > 0) {
			if (validateViewRetryCounter < validateViewRetryLimit) {
				if (loadingDelay || displayDelay) {
					validateViewRetryCounter += 1;
					self.updateView(true);
				} else {
					validateViewTimer = window.setTimeout( validateViewTimerHandler, validateViewDelay);
				}
			} else {
				console.log(Z.Utils.getResource('ERROR_VALIDATEVIEW'));

				// Alternative implementation: Display status in Viewport.
				//Z.Utils.showMessage(Z.Utils.getResource('ERROR_VALIDATEVIEW'), false, Z.messageDurationStandard, 'center');
			}
		} else {
			validateViewRetryCounter = 0;

			// Debug option: console.log('viewUpdateComplete - time elapsed: ' + tilesTimeElapsed);
			Z.Utils.validateCallback('viewUpdateComplete');
			Z.Utils.validateCallback('viewUpdateCompleteGetLabelIDs');
		}
	}

	// Update progress indicator in toolbar.
	this.updateProgress = function (total, current) {
		Z.updateViewPercent = calculateProgressPercent(total, current);
		if (Z.Toolbar && Z.ToolbarDisplay && Z.Toolbar.getInitialized()) { Z.Toolbar.updateProgress(total, current); }
	}

	function calculateProgressPercent (total, current) {
		if (total == 0 && current == 0) {
			// Debug option: console.log('loadingTilesComplete');
			Z.Utils.validateCallback('loadingTilesComplete');
			Z.Utils.validateCallback('loadingTilesCompleteGetLabelIDs');
		} else {
			var percentComplete = Math.round(100 - (current / total) * 100);
			return Math.round(percentComplete / 10);
		}
	}



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: INTERACTION FUNCTIONS :::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// DEV NOTES: Variable Z.imageR updated during implementation of rotation rather than
	// once in updateView. This differs from updating of variables Z.imageX/Y/Z. Comparison of
	// approaches in progress. Variable Z.preventDupCall set to ensure values set by call in reset
	// function are not overridden by duplicated call in updateView function. Rounding required
	// because rotation functions currently support exact 90 degree increments only.
	function recordPriorViewCoordinates () {
		var viewChanged = (Z.imageX != Z.priorX || Z.imageY != Z.priorY || Z.imageZ != Z.priorZ || Z.imageR != Z.priorR);
		if (!Z.preventDupCall && viewChanged) {
			Z.priorX = Z.imageX;
			Z.priorY = Z.imageY;
			Z.priorZ = Z.imageZ;
			Z.priorR = Z.imageR;
		}		
		Z.preventDupCall = (typeof called !== 'undefined' && called !== null);
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
		if (cRotation != 0) { Z.Utils.rotateElement(cS, cRotation, true); }
	}

	this.setView = function (x, y, z, r, callback, override) {
		view(x, y, z, r, callback, override);
	}

	// View assignment function.
	function view (x, y, z, r, callback, override) {
		if (!override) { self.zoomAndPanAllStop(); }
		if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }

		// Optional parameters override defaults, if set.
		if (typeof x === 'undefined' || x === null) { x = Z.imageX; }
		if (typeof y === 'undefined' || y === null) { y = Z.imageY; }
		if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }

		// Calculate special values.
		if (x == 'center' || isNaN(parseFloat(x))) { x = Z.imageCtrX; }
		if (y == 'center' || isNaN(parseFloat(y))) { y = Z.imageCtrY; }
		if (z == -1 || isNaN(parseFloat(z))) { z = Z.fitZ; }

		if (typeof z === 'undefined' || z === null) {
			z = Z.fitZ;
		} else if (z > 1 && z > Z.maxZ) {
			z = z / 100;
		}
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }

		// Constrain coordinate values.
		z = constrainZoom(z);
		r = constrainRotation(r);
		var constrainedPt = constrainPan(x, y, z, r, 'image');

		// Assign coordinate values.
		Z.imageX = imageX = constrainedPt.x;
		Z.imageY = imageY = constrainedPt.y;
		Z.imageZ = z;

		// Apply coordinate values.
		if (r != Z.imageR) { Z.Utils.rotateElement(cS, r); }
		Z.imageR = r;
		self.updateView(true);
		if (typeof callback === 'function') { callback(); }
	}

	this.zoom = function (zoomDir) {
		// Avoid redundant calls resulting in redundant updateView calls below.
		if (zoomDir == 'stop' && Z.zooming == 'stop') { return; }

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
		Z.zooming = (zoomVal == 0) ? 'stop' : ((zoomVal > 0) ? 'in' : 'out');

		if (zoomVal !=0) {
			if (!zapTimer) {
				if (((zoomVal < 0) && (Z.imageZ > Z.minZ)) || ((zoomVal > 0) && (Z.imageZ < Z.maxZ))) {
					self.toggleWatermarks(false);
					if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(false); }
				}
				if (!Z.useCanvas) { Z.Utils.clearDisplay(wD); }
				zapTimer = window.setTimeout(zoomAndPanContinuousStep, zapStepDuration);
			}
		} else {
			zoomAndPanContinuousStop();
			self.updateView();
			self.toggleWatermarks(true);
			if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(true); }
		}
	}

	// Pan direction refers to the pan of the view - the opposite of the movement of the image.
	this.pan = function (panDir) {
		// Avoid redundant calls resulting in redundant updateView calls below.
		if (panDir == 'horizontalStop' && Z.panningX == 'stop') { return; }
		if (panDir == 'verticalStop' && Z.panningY == 'stop') { return; }

		if (!Z.tracking) {
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

		Z.panningX = (panX == 0) ? 'stop' : ((panX > 0) ? 'left' : 'right');
		Z.panningY = (panY == 0) ? 'stop' : ((panY > 0) ? 'up' : 'down');
		zapTierCurrentZoomUnscaledX = Z.imageX * convertTierScaleToZoom(tierCurrent, 1);
		zapTierCurrentZoomUnscaledY = Z.imageY * convertTierScaleToZoom(tierCurrent, 1);

		if (panX !=0 || panY != 0) {
			if (!zapTimer) {
				// Clear watermarks for faster, smoother zoom.
				self.toggleWatermarks(false);
				if (!Z.useCanvas) { Z.Utils.clearDisplay(wD); }
				if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(false); }
				zapTimer = window.setTimeout(zoomAndPanContinuousStep, zapStepDuration);
			}
		} else {
			zoomAndPanContinuousStop();
			self.updateView();
			self.toggleWatermarks(true);
			if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(true); }
		}
	}

	function zoomAndPanContinuousStep () {
		if (zapTimer) {
			// If interval, pan, zoom values not cleared, pan and/or zoom one step.
			if (panX != 0 || panY != 0 || zoomVal != 0) {
				if (!Z.tracking || zoomVal != 0) {
					zoomAndPan(panX, panY, zoomVal);
					// If pan and zoom variables have not been cleared, recall timer.
					zapTimer = window.setTimeout(zoomAndPanContinuousStep, zapStepDuration);
				} else {
					self.zoomAndPanToView(self.getX() + panX, self.getY() + panY);
				}
			}
		}
	}

	function zoomAndPan (stepX, stepY, stepZ) {
		// Pan constraint is applied separately to direct pan and to the indirect pan that
		// occurs when zooming out if image off-center. This enables prevention rather
		// than correction of dissallowed pan and avoids jitter at boundary conditions.
		var viewPanned = false, syncSlider = false, syncNav = false;
		var constrainedZ = self.getZoom();

		if (stepZ != 0) {
			// Calculate change to scale of tier.  For zoom buttons and keys, meter progress by
			// increasing weight of each step as tier scale grows and decreasing as scale shrinks.
			var targetScale = tierScale *  (1 + stepZ);

			// Calculate target zoom for current step based on target scale for current step.
			var targetZoom = convertTierScaleToZoom(tierCurrent, targetScale);

			// Constrain target zoom.
			constrainedZ = constrainZoom(targetZoom);
			if (constrainedZ != Z.imageZ) {
				// Scale the viewport display to implement zoom step.
				syncSlider = syncNav = scaleTierToZoom(constrainedZ);
			}
		}

		if (stepX != 0 || stepY != 0) {
			// Calculate new container position.
			var targetL = parseFloat(cS.left) + stepX;
			var targetT = parseFloat(cS.top) + stepY;

			// Calculate constrained new position and set viewport display to new position.
			var constrainedPt = constrainPan(targetL, targetT, constrainedZ, Z.imageR, 'container');

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
			self.syncViewportRelated();
		} else if (zapStepCount % 2 == 0) {
			self.syncViewportRelated();
		}
		zapStepCount++;

		// Load new tiles as needed during panning (not zooming).
		/* DEV NOTE: Updating tiles while panning disabled. Requires optimization.
		if (viewPanned) {
			var canvasScale = (Z.useCanvas) ? (parseFloat(vS.width) / vD.width) : 1;
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
		self.zoomAndPanAllStop();

		// Second, if block enabled to prevent conflict with hotspot click-link, do not implement new zoom-and-pan effect and clear block.
		if (Z.clickZoomAndPanBlock && (typeof override === 'undefined' || override === null || !override)) {
			Z.clickZoomAndPanBlock = false;
			return;
		}

		// Optional parameters override defaults, if set.
		if (typeof targetX === 'undefined' || targetX === null) { targetX = Z.imageX; }
		if (typeof targetY === 'undefined' || targetY === null) { targetY = Z.imageY; }
		if (typeof targetZ === 'undefined' || targetZ === null) { targetZ = Z.imageZ; }
		if (typeof targetR === 'undefined' || targetR === null) { targetR = Z.imageR; }
		if (typeof duration === 'undefined' || duration === null) { duration = zaptvDuration; }
		if (typeof steps === 'undefined' || steps === null) { steps = zaptvSteps; }

		// Calculate special values.
		if (targetX == 'center' || isNaN(parseFloat(targetX))) { targetX = Z.imageCtrX; }
		if (targetY == 'center' || isNaN(parseFloat(targetY))) { targetY = Z.imageCtrY; }
		if (targetZ == -1 || isNaN(parseFloat(targetZ))) { targetZ = Z.fitZ; }

		// Next, clear watermarks and hotspots for fast, smooth zoom.
		self.toggleWatermarks(false);
		if (!Z.useCanvas) { Z.Utils.clearDisplay(wD); }
		if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(false); }

		// Validate zoom value.
		if (typeof targetZ === 'undefined' || targetZ === null) { // Define target zoom if not provided.
			targetZ = Z.initialZ;
		} else if (targetZ > 100) { // Convert to decimal range.
			targetZ /= 100;
		} else if (targetZ > Z.maxZ) { // Constrain to max zoom.
			targetZ = Z.maxZ;
		} else if (targetZ < Z.maxZ && targetZ > Z.maxZ - 0.01) { // Force exact arrival at max zoom.
			targetZ = Z.maxZ;
		}

		// Constrain target coordinates.
		var constrainedTargetPoint = constrainPan(targetX, targetY, targetZ, targetR, 'image');
		targetX = constrainedTargetPoint.x;
		targetY = constrainedTargetPoint.y;
		targetZ = constrainZoom(targetZ);

		// Implement zoom and pan to view, if pan is needed or zoom is needed and it is not outside min and max constraints.
		if (Math.round(targetX) != Math.round(Z.imageX) || Math.round(targetY) != Math.round(Z.imageY) || Math.round(targetZ * 100000) != Math.round(Z.imageZ * 100000) || Math.round(targetR) != Math.round(Z.imageR)) {
			// Disable interactivity if steps include rotation to avoid stopping between 90 degree increments.
			Z.interactive = false;

			// Set step counter.
			zaptvStepCurrent = 0;

			// Debug option: add horizontal and vertical lines ('cross hairs') to verify
			// end point accuracy. Can also be set using HTML parameter zCrosshairsVisible=1.
			//Z.Utils.drawCrosshairs(Z.ViewerDisplay, viewW, viewH);

			// Set global zaptv instance ID for stepping function to compare prior to creating each step's timer.
			Z.zoomAndPanInProgressID = targetX.toString() + '-' + targetY.toString() + '-' + targetZ.toString() + '-' + targetR.toString();

			// Begin steps toward target coordinates.
			zoomAndPanToViewStep(targetX, targetY, targetZ, targetR, duration, steps, callback);
		}
	}

	function zoomAndPanToViewStep (tX, tY, tZ, tR, duration, steps, callback) {
		// If global zaptv instance ID does not match ID of this step then this iteration thread has been superceded, end it.
		if (Z.zoomAndPanInProgressID != tX.toString() + '-' + tY.toString() + '-' + tZ.toString() + '-' + tR.toString()) {
			return;
		}			

		// Increment step counter and calculate time values.
		zaptvStepCurrent++;
		var stepDuration = duration / steps;
		var currentStepTime = zaptvStepCurrent * stepDuration;

		// Calculate eased step values.
		var newX = Z.Utils.easing(Z.imageX, tX, currentStepTime, duration);
		var newY = Z.Utils.easing(Z.imageY, tY, currentStepTime, duration);
		var newZ = Z.Utils.easing(Z.imageZ, tZ, currentStepTime, duration);
		var newR = Z.Utils.easing(Z.imageR, tR, currentStepTime, duration);

		// DEV NOTE: Additional option: adjust pan for zoom. When zooming in, all points move
		// away from center which magnifies pan toward points to right and/or below center and
		// minifies pan toward points to left and above center. Zooming out creates opposite
		// effect. Current implementation mitigates this impact partially and adequately.

		// Convert step image pixel values to viewport values.
		var newPt = self.convertImageCoordsToViewportEdgeCoords(newX, newY, newZ);
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
		if (newZ != Z.imageZ) {
			scaleTierToZoom(newZ, false);
			syncSlider = syncNav = true;
			if (oD && tierBackfillDynamic) {
				oCtx.restore();
				oCtx.save();
				oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
				syncOversize = true;
			}
		}
		if (newR != Z.imageR) {
			Z.Utils.rotateElement(cS, newR);
			if (oD && tierBackfillDynamic) {
				var deltaR = newR - Z.imageR;
				oCtx.rotate(deltaR * Math.PI / 180);
				syncOversize = true;
			}
			Z.imageR = newR;
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
		self.syncViewportRelated(false, syncHotspots, false, false, false);
		if (zaptvStepCurrent % 2 == 0) {
			self.syncViewportRelated(false, false, syncSlider, syncNav, syncSlider);
		}

		var blockSteps = (Z.tour && Z.tourStop && Math.round(Z.imageR % 90) == 0)

		// Take additional step toward target or finalize view, depending on step counter.
		if (zaptvStepCurrent < steps+1 && !blockSteps) {
			zaptvTimer = window.setTimeout( function () { zoomAndPanToViewStep(tX, tY, tZ, tR, duration, steps, callback); }, stepDuration);

		} else {
			// Update view and reset watermarks to visible if present.
			if (blockSteps) { Z.tourPlaying = false; }
			Z.interactive = true;
			zoomAndPanToViewStop();
			self.updateView();
			self.toggleWatermarks(true);
			if (hotspots && hotspots.length > 39) { self.setHotspotsVisibility(true); }
			if (typeof callback === 'function') { callback(); }
		}
	}

	this.zoomAndPanAllStop = function (override, overridePlaying) {
		if (Z.interactive) {
			if (Z.zoomAndPanInProgressID !== null || zaptvTimer) {
				zoomAndPanToViewStop();
			}
			if (Z.tourPlaying && overridePlaying) {
				self.tourStop();
				override = false;
			}
			if (Z.slideshowPlaying && overridePlaying) {
				self.slideshowStop();
				override = false;
			}
			if (Z.smoothPan && smoothPanInterval !== null) {
				if (!Z.mouseIsDown) { smoothPanStop(true); }
				override = true;
			}

			if (!override) {
			self.updateView(null, null, true); }
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
		if (Z.zoomAndPanInProgressID !== null || zaptvTimer) {
			Z.zoomAndPanInProgressID = null;
			zaptvStepCurrent = zaptvSteps;
			window.clearTimeout(zaptvTimer);
			zaptvTimer = null;
		}
	}

	// Sync related displays and components.
	this.syncViewportRelated = function (syncWatermarks, syncHotspots, syncSlider, syncNavigator, syncRuler, syncImageSetSlider, syncComparisonVP, syncOverlayVPs, syncBookmarksURL, syncTracking, syncMagnifier) {
		if (Z.expressParamsEnabled) {
			if (Z.sliderZoomVisible && (typeof syncSlider === 'undefined' || syncSlider === null || syncSlider)) { syncToolbarSliderToViewport(); }
			if (Z.Navigator && (typeof syncNavigator === 'undefined' || syncNavigator === null || syncNavigator))  { syncNavigatorToViewport(); }
		}
		Z.Utils.validateCallback('viewChanging');
		Z.Utils.validateCallback('viewPanningGetCurrentCoordinates');
		Z.Utils.validateCallback('viewChangingGetCurrentCoordinatesFull');
	}

	this.scaleTierToZoom = function (imageZ, syncOversize) {
		var sync = scaleTierToZoom(imageZ, syncOversize);
		if (sync) { self.syncViewportRelated(); }
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
				var constrainedPt = constrainPan(parseFloat(cS.left), parseFloat(cS.top), imageZ, Z.imageR, 'container');
				cS.left = constrainedPt.x + 'px';
				cS.top = constrainedPt.y + 'px';
			}

			// Apply new scale to displays.
			if (Z.useCanvas) {
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
				tierBackfillOversizeScale = convertZoomToTierScale(tierBackfillOversize, self.getZoom());
				var override = (tierBackfillOversizeScale > 8); // Slider snap or mousewheel can create need for oversize backfill before selectTier resets tierBackfillDynamic = true.
				if (tierBackfillDynamic || override) {

					// Update oversize backfill if conditions apply. Variable syncOversize avoids duplicate redisplays of oversize backfill. Set false by calls from zoomAndPan,
					// zoomAndPanToViewStep (and indirectly, Reset), and set true or unset by sliderSnap, sliderSlide, and handlers for mousewheel, and gestures.
					if (oCtx !== null && typeof syncOversize === 'undefined' || syncOversize === null || syncOversize && oD && (Z.zooming != 'in' || (newW > Z.scaleThreshold || newH > Z.scaleThreshold))) {
						oCtx.restore();
						oCtx.save();
						oCtx.scale(tierBackfillOversizeScale, tierBackfillOversizeScale);
						oCtx.rotate(Z.imageR * Math.PI / 180);
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
					if (oD) { Z.Utils.clearDisplay(oD); } // If use slider to zoom-in then zoom-out without stopping to update view, must clear oversize backfill, if present, or it will show in borders.

					newW = backfillW * scaleDelta;
					newH = backfillH * scaleDelta;
					newL = backfillL + ((Z.imageX  * (1 - scaleDelta)) * Z.imageZ);
					newT = backfillT + ((Z.imageY * (1 - scaleDelta)) * Z.imageZ);
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
					var deltaX = Z.imageX * imageZ;
					var deltaY = Z.imageY * imageZ;
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
		if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }
		if (!prior) {
			self.zoomAndPanToView(Z.initialX, Z.initialY, Z.initialZ, Z.initialR);
		} else {
			Z.Utils.setButtonDefaults(buttonReset);
			self.zoomAndPanToView(Z.priorX, Z.priorY, Z.priorZ, Z.priorR);
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
					self.modifyLabel(hotspotCurrentID, 'xScale', targetScaleX, true, true);
					self.modifyLabel(hotspotCurrentID, 'yScale', targetScaleY, false, true);				;

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
		Z.constrainPan = (typeof override !== 'undefined' && override !== null) ? override : !Z.constrainPan;
		if (Z.constrainPan) {
			var x = parseFloat(vS.left);
			var y = parseFloat(vS.top);
			var constrainedPt = constrainPan(x, y, Z.imageZ, Z.imageR, 'container');
			cS.left = constrainedPt.x + 'px';
			cS.top = constrainedPt.y + 'px';
			self.updateView();
		}
	}

	this.toggleSmoothPan = function () {
		smoothPanStop();
		Z.smoothPan = !Z.smoothPan;
	}

	this.toggleSmoothZoom = function () {
		zoomAndPanToViewStop();
		Z.smoothZoom = !Z.smoothZoom;
	}

	this.buttonToggleBackfillHandler = function () {
		self.toggleBackfill();
	}

	this.toggleBackfill = function (override) {
		var bD = document.getElementById('viewportBackfillDisplay' + viewportID.toString());
		if (bD) {
			var bS = bD.style;
			var visibilityCurrent = (bS.display == 'inline-block');
			var visibility = (typeof override !== 'undefined' && override !== null) ? override : !visibilityCurrent;
			bS.display = (visibility) ? 'inline-block' : 'none';
		}
	}

	this.buttonToggleDisplayHandler = function () {
		self.toggleDisplay();
	}

	this.toggleDisplay = function (override) {
		var vD = document.getElementById('viewportDisplay' + viewportID.toString());
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
		var currentR = self.getRotation();
		var zRectZ = self.calculateZoomToFit(w, h, currentR);

		// Alternative implementation: Compare narrower rectangle dimension to display rather than wider.
		//var zRectZ = self.calculateZoomToFill(w, h, currentR);

		self.zoomAndPanToView(centerX, centerY, zRectZ);
	}

	this.toggleFullViewModeExternal = function () {
		// Assumes call from external toolbar and internal toolbar hidden. Sets tracking variable to cause display
		// Exit button over viewport in full screen mode when external toolbar is hidden under viewport.
		buttonFullViewExitExternalVisible = true;
		self.toggleFullViewMode();
	}

	this.toggleFullViewMode = function (override, escaped) {
		// DEV NOTE: Testing interaction between mode change and zoom-and-pan in progress.
		//self.zoomAndPanAllStop();

		if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }

		// Hide toolbar if visible.
		if (Z.ToolbarDisplay && Z.Toolbar) { Z.Toolbar.show(false); }

		var width = null;
		var height = null;

		// If override is false (called by Escape key) set false, otherwise, set to opposite of current state.
		Z.fullViewPrior = Z.fullView;
		Z.fullView = (typeof override !== 'undefined' && override !== null) ? override : !Z.fullView;

		// Declare and set document references.
		var fvB = document.body;
		var fvbS = fvB.style;
		var fvdS = document.documentElement.style;
		var fvvS = Z.ViewerDisplay.style;
		var fvcS = Z.Utils.getElementStyle(Z.pageContainer);
		var dimensions;

		if (Z.fullView) {
			// Record non-full-page values.
			var containerDims = Z.Utils.getContainerSize(Z.pageContainer, Z.ViewerDisplay);

			fvBodW = containerDims.x;
			fvBodH = containerDims.y;
			fvBodO = fvbS.overflow;
			fvDocO = fvdS.overflow;
			fvContBC = (Z.Utils.stringValidate(fvcS.backgroundColor) && fvcS.backgroundColor != 'transparent') ? fvcS.backgroundColor : (Z.Utils.stringValidate(fvbS.backgroundColor) && fvbS.backgroundColor != 'transparent') ? fvbS.backgroundColor : Z.Utils.getResource('DEFAULT_FULLVIEWBACKCOLOR');
			fvContPos = fvvS.position;
			fvContIdx = fvvS.zIndex;

			// Implement full screen or full page view.
			if (Z.fullScreenSupported && !Z.fullPageVisible) {
				dimensions = Z.Utils.getScreenSize();
				Z.fullScreenEntering = true; // Subverts change event on mode entry.
				Z.Utils.fullScreenView(Z.ViewerDisplay, true);
				Z.Utils.validateCallback('fullscreenEntered');

			} else {
				dimensions = Z.Utils.getWindowSize();
				if (!Z.mobileDevice) {
					fvbS.width = '100%';
					fvbS.height = '100%';
				} else {
					fvbS.width = dimensions.x;
					fvbS.height = dimensions.y;
				}
				Z.Utils.validateCallback('fullpageEntered');
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
			if (Z.autoResize) { Z.Utils.removeEventListener(window, 'resize', Z.Viewer.viewerEventsHandler); }

		} else {
			// Reset related settings.
			fvbS.overflow = fvBodO;
			fvdS.overflow = fvDocO;
			fvvS.backgroundColor = fvContBC;
			fvvS.position = 'relative';
			fvvS.zIndex = fvContIdx;

			// Unimplement full screen or full page view.
			if (Z.fullScreenSupported && !Z.fullPageVisible) {
				Z.Utils.fullScreenView(Z.ViewerDisplay, false, escaped);
				Z.Utils.validateCallback('fullscreenExited');
			} else {
				Z.Utils.validateCallback('fullpageExited');
			}

			fvbS.width = fvBodW;
			fvbS.height = fvBodH;
			width = fvBodW;
			height = fvBodH;
			if (isNaN(width)) { width = Z.ViewerDisplay.clientWidth; }
			if (isNaN(height)) { height = Z.ViewerDisplay.clientHeight; }

			// Hide exit button in case visible due to external full view call.
			buttonFullViewExitExternalVisible = false;

			// Reenable auto-resizing disabled above to prevent conflict with full view mode change.
			if (Z.autoResize) { Z.Utils.addEventListener(window, 'resize', Z.Viewer.viewerEventsHandler); }
		}

		// If page container is sized with pixel values rather than percentages or ‘vw’ and ‘vh’ auto-resizing will occur and resize must be called.
		if (Z.initialFullPage) { self.setSizeAndPosition(width, height); }

		var newZoom = Z.viewportCurrent.calculateZoomForResize(Z.viewportCurrent.getZoom(), Z.viewerW, Z.viewerH, width, height);
		Z.Viewer.resizeViewer(width, height, newZoom);

		var vpComparison = null;
		if (Z.slideshow) {
			Z.Toolbar.gallerySizeAndPositionReset();
		} else if (Z.comparison) {
			vpComparison = (self.getViewportID() == 0) ? Z.Viewport1 : Z.Viewport0;
			if (vpComparison) { vpComparison.syncViewportResize(Z.imageX, Z.imageY, Z.imageZ, Z.imageR); }
		} else if (Z.overlays) {
			for (var i = 0, j = Z.imageSetLength - 1; i < j; i++) {
				// -1 in line above prevents top VP from resetting itself in loop.
				Z['Viewport' + i.toString()].syncViewportResize(Z.imageX, Z.imageY, Z.imageZ, Z.imageR);
			}
		} else if (Z.narrative) {
			Z.Narrative.drawLayoutNarrativePanel();
			if (Z.narrativeMode) { Z.Narrative.drawLayoutFileManagerPanel(); }
		}
		if (Z.imageList && self.getStatus('initializedImageList')) {
			self.setSizeAndPositionImageList();
			if (vpComparison && vpComparison.getStatus('initializedImageList')) { 
				vpComparison.setSizeAndPositionImageList();
			}
		}
		if (Z.annotationFileList && self.getStatus('initializedAnnotationFileList')) {
			self.setSizeAndPositionAnnotationFileList();
		}

		// Set full view or full view exit button visible based on full view status. If using external toolbar in page, display external exit button over viewport.
		showButtonFullViewExitInternal(Z.fullView);
		showButtonFullViewExitExternal(buttonFullViewExitExternalVisible);

		// Clear variable ensuring updateView on exit of full page view.
		Z.fullViewPrior = false;
	}

	function showButtonFullViewExitInternal (value) {
		var bFV = document.getElementById('buttonFullView');
		var bFVE = document.getElementById('buttonFullViewExit');
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
		var btnL = parseFloat(Z.viewerW) - (btnW + btnMargin);
		var btnT = parseFloat(Z.viewerH) - (btnH + btnMargin);
		var btnColor = Z.Utils.getResource('DEFAULT_FULLVIEWEXITEXTERNALBUTTONCOLOR');
		buttonFullViewExitExternal = new Z.Utils.Button('buttonFullViewExitExternal', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', buttonFullViewExitExternalHandler, 'TIP_TOGGLEFULLVIEWEXITEXTERNAL', 'solid', '1px', btnColor, '0px', '0px');
		Z.ViewerDisplay.appendChild(buttonFullViewExitExternal.elmt);
	}

	function buttonFullViewExitExternalHandler () {
		self.toggleFullViewMode(false);
	}

	this.rotate = function (rotationDir, isAltKey) {
		// Record prior X, Y, Z, and R values.
		//recordPriorViewCoordinates();

		if (!Z.rotationFree || isAltKey) {
			if (Z.imageR % 90 != 0) { Z.imageR = Math.round(Z.imageR / 90) * 90; }
			var degDelta = (rotationDir == 'clockwise') ? 90 : -90;
			self.rotateStep(degDelta, true);

		} else {
			if (rotationDir == 'stop' && Z.rotating == 'stop') { return; }
			rotVal = (rotationDir == 'stop') ? 0 : (rotationDir == 'clockwise') ? rotStepDegrees : -rotStepDegrees;
			Z.rotating = (rotVal == 0) ? 'stop' : ((rotVal > 0) ? 'clockwise' : 'counterwise');
			if (rotVal !=0) {
				if (!rotTimer) {
					rotTimer = window.setTimeout(rotateContinuousStep, rotStepDuration);
				}
			} else {
				rotateContinuousStop();
				self.updateView();
			}
		}
	}

	function rotateContinuousStep () {
		if (rotTimer) {
			// If interval and rotation values not cleared, rotate one step.
			if (rotVal != 0) {
				self.rotateStep(rotVal, false);
				// If rotation variable has not been cleared, recall timer.
				rotTimer = window.setTimeout(rotateContinuousStep, rotStepDuration);
				var syncHotspots = (hotspots && hotspots.length < 40);
				self.syncViewportRelated(false, syncHotspots, false, true, false);
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
		var rotationValueNew = Z.imageR + degreesDelta;
		self.rotateSet(rotationValueNew, useZaptv, syncVP);
	}

	this.rotateSet = function (rotValNew, useZaptv, syncVP) {
		if (!Z.interactive) { return; }
		if (Z.rotationSupported) {

			if (!Z.rotationFree) {
				Z.interactive = false;
				var rotValConstrained = constrainRotation(rotValNew);

				// Use zoom and pan function to gradually rotate to new rotation and/or to invoke pan constraint and reset
				// coordinates, if necessary.  Set Z.imageR to constrained value after new unconstrained value implemented
				// to avoid backward 270 rotation when rotating from 270 to 360 (0) or from -270 to -360 (0).
				if (useZaptv) {
					self.zoomAndPanToView(Z.imageX, Z.imageY, Z.imageZ, rotValNew, 600, 12, function () { Z.imageR = rotValConstrained; });
				} else if (syncVP) {
					Z.Utils.rotateElement(cS, Z.imageR, true);
					Z.interactive = true;
				} else {
					Z.Utils.rotateElement(cS, rotValNew);
					if (oD && Z.imageR != 0) {
						var deltaR = rotValNew - Z.imageR;
						oCtx.rotate(deltaR * Math.PI / 180);
					}
					Z.imageR = rotValConstrained;
					self.zoomAndPanToView(Z.imageX, Z.imageY, Z.imageZ);
				}

			} else {
				if (syncVP) {
					Z.Utils.rotateElement(cS, Z.imageR, true);
					Z.interactive = true;
				} else {
					Z.Utils.rotateElement(cS, rotValNew);
					Z.imageR = rotValNew;

					// Sync related components.
					syncNavigatorToViewport();

					// Alternative implementation: do not hide backfills, hotspots, watermarks, etc. and sync rotation.
					//var syncHotspots = (hotspots && hotspots.length < 40);
					//self.syncViewportRelated(false, syncHotspots, false, true, false, false, true, false, false, false);
				}
			}
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ALERT_ROTATIONREQUIRESNEWERBROWSER'));
		}
	}

	this.toggleEditModeMeasure = function (override) {
		self.zoomAndPanAllStop();
		if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }

		// If override is false set false, otherwise, set to opposite of current state.
		if (typeof override !== 'undefined' && !override || Z.labelMode == 'measure') {

			// If measuring while not in edit mode be sure to delete any hotspot polygons previously created to display a measurement.
			if (Z.editMode === null && Z.labelMode == 'measure' && hotspots.length > 0) {
				self.deleteAllMeasureHotspots();
				hotspotCurrentID = null;
			}
			self.setEditModeLabel('view');

		} else {
			self.setEditModeLabel('measure', null, null, null, null, true);
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
			var openPoly = (!polygonComplete && (Z.labelMode == 'polygon' || Z.labelMode == 'measure'));
			var isRightMouseBtn = Z.Utils.isRightMouseButton(event);
			var isAltKey = event.altKey;
			var blockRightClick = isRightMouseBtn && !openPoly;

			if ((eventType != 'mouseover' && eventType != 'mouseout' && !Z.interactive)
				|| (eventType == 'mousedown' && (!Z.interactive || (Z.coordinatesVisible && isAltKey)))
				|| blockRightClick) {
				Z.tourStop = true; // Prevents autostart if not started or next destination.
				return;
			} else if (eventType == 'mousedown' || eventType == 'touchstart' || (Z.tourPlaying && Z.tourStop)) {
				self.zoomAndPanAllStop();
				if (Z.tour) { self.tourStop(); } // Sets Z.tourPlaying = false;
				Z.tourStop = true;
				Z.interactive = true;
			}

			if (Z.touchSupport && !Z.clickZoomAndPanBlock && eventType != 'touchmove' && eventType != 'gesturechange') {
				event.preventDefault();
			}
			if (eventType == 'mousedown') {
				var displayMouseDownTimer = window.setTimeout( function () { self.zoomAndPanAllStop(false, true); }, 1);
				if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }

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

				self.zoomAndPanAllStop(false, true);
				if (Z.maskingSelection && Z.maskClearOnUserAction) { self.clearMask(); }
			}

			// Handle event resetting.
			switch(eventType) {
				case 'mouseover' :
					// Prevent page scrolling using arrow keys. Also implemented in text element blur handler.
					if (!Z.fullView && document.activeElement.tagName != 'TEXTAREA') {
						Z.Viewer.initializeViewerKeyDefaultListeners(true);
					}
					break;
				case 'mousedown' :
					// Ensure mouse interaction with viewport re-enables key interaction by removing focus from any text area and adding key listeners.
					if (!Z.fullView && document.activeElement) { document.activeElement.blur(); }
					Z.Viewer.initializeViewerKeyEventListeners(true);

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
		if (Z.annotations) { resetAnnotationPanel(); }
		
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
				if (!Z.gestureSupport) {
					touch2 = Z.Utils.getSecondTouch(event);
					if (touch2) { mPt2 = new Z.Utils.Point(touch2.pageX, touch2.pageY); }
				}
			} else {
				target = Z.Utils.target(event);
				relatedTarget = Z.Utils.relatedTarget(event);
				var isRightMouseBtn = Z.Utils.isRightMouseButton(event);
				if (eventType != 'resize') { mPt = Z.Utils.getMousePosition(event); }
			}
			if (Z.smoothPan && mPt) { smoothPanMousePt = mPt; }
			
			// Calculate zoom and click values. If no gesture support get second click point for pinch support.
			var zVal = self.getZoom();
			var zValStr = (zVal * 100).toString();
			var clickPt = (mPt) ? self.getClickCoordsInImage(event, zVal, mPt) : null;
			var clickPt2 = (mPt2 && !Z.gestureSupport) ? self.getClickCoordsInImage(event, zVal, mPt2) : null;
			
			// Get simplified event type. Supported values: 'start', 'move', 'end', 'gesturestart', 'gesturechange', 'gestureend', 'pinchstart', 'pinchchange', 'pinchend'.
			zoomifyEvent = getZoomifyEvent(event);

			// Implement actions.
			switch(zoomifyEvent) {

				case 'start' :
					zoomifyAction = getZoomifyAction(target, clickPt, isAltKey); // Supported values: 'navigateImage', 'zoomRectangleImage', 'createLabelSimple', 'createLabelAndControlPoint', 'createControlPoint', 'selectLabel', 'editLabel', 'editControlPoint'.

					dragPtStart = new Z.Utils.Point(mPt.x, mPt.y);
					dragTimeStart = new Date().getTime();	
					Z.mouseIsDown = true;
					Z.altKeyIsDown = isAltKey;	
					var captionPosition = (Z.captionPosition) ? Z.captionPosition : '8';
					wasGesturing = wasPinching = false;

					switch (zoomifyAction) {
						case 'navigateImage' :
							if (Z.comparison && target.id.indexOf('viewportDisplay') != -1) { Z.Viewer.viewportSelect(parseInt(target.id.substring(target.id.indexOf('viewportDisplay') + 15, target.id.length))); }
							if (Z.smoothPan) {
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
							if (Z.labelMode == 'fieldofview') {
								self.createLabelFromParameters(null, null, Z.labelMode, null, null, Z.imageX.toString(), Z.imageY.toString(), zValStr, viewW, viewH, null, null, null, '0', '0', null, null, null, 'FOV', null, null, captionTextColor, null, null, null, null, null, null, null, null, '5', '0', null, null);
							} else if (Z.labelMode == 'counter') {
								self.createLabelCounter(clickPt);
							} else {
								self.createLabelFromParameters(null, null, Z.labelMode, null, null, clickPt.x.toString(), clickPt.y.toString(), zValStr, null, null, null, null, null, '0', '0', null, null, null, null, null, null, captionTextColor, null, null, null, null, null, null, null, null, '5', '0', null, null);
							}
							if (Z.labelMode != 'counter') { self.updateAnnotationPanelForNewLabel(); }
							break;
						case 'createLabelShape' : // New shape: arrow, line, square, rectangle, circle, ellipse, triangle. 
							var shapeList = document.getElementById('labelShapeList' + vpIDStr);
							if (shapeList) {
								self.createLabelFromParameters(null, null, Z.labelMode, shapeList[shapeList.selectedIndex].value, null, clickPt.x.toString(), clickPt.y.toString(), zValStr, null, null, null, null, null, '0', '0', null, null, null, null, null, null, captionTextColor, null, selectedLineColor, selectedFillColor, null, null, null, null, null, captionPosition, '0', null, null);
								self.updateAnnotationPanelForNewLabel();
								//DEV NOTE: remove next line and uncomment matching call in 'end' event below when enabling click-drag shape creation.
								updateShapeSize(hotspotCurrentID);								
							}
							break;
						case 'createLabelAndControlPoint' : // New Freehand, Polygon, or Measure label. 
							var polygonPts = createPolygonPoints(clickPt);
							polygonComplete = polygonClosed = false; // If creating polygon in Edit mode, enable bungee drawing by not disabling mousemove event handler.
							if (Z.labelMode == 'freehand') { 
								zoomifyAction = 'createControlPoint'; // Update zoomifyAction for move event here because otherwise only set on start event.
							} else if (Z.editMode === null && Z.labelMode == 'measure' &&  hotspots.length > 0) {
								self.deleteAllMeasureHotspots(); // If measuring while not in edit mode, be sure to first delete any hotspot polygons previously created to display a measurement.
							}
							self.createLabelFromParameters(null, null, Z.labelMode, 'polygon', null, clickPt.x.toString(), clickPt.y.toString(), zValStr, null, null, null, null, null, '0', '0', null, null, null, null, null, null, captionTextColor, null, selectedLineColor, null, null, null, null, null, null, captionPosition, '0', null, null, null, null, '0', polygonPts, null, null, null, null, null, '1');
							self.updateAnnotationPanelForNewLabel();
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
							controlPointCurrent = getTargetControlPoint(clickPt, Z.labelMode);
							break;
					}
					break;
					
				case 'move' :				
					dragPtCurrent = new Z.Utils.Point(mPt.x, mPt.y);
					var mPtZX = (clickPt.x - Z.imageX) * zVal;
					var mPtZY = (clickPt.y - Z.imageY) * zVal;		
						
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
							if (Z.labelMode == 'freehand') {
								if (Z.mouseIsDown) { drawFreehand(lastPtX, lastPtY, mPtZX, mPtZY, clickPt); }
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
					Z.mouseIsDown = false;
					switch (zoomifyAction) {
						case 'navigateImage' :
							updateImageNavigation(event, mPt, zVal, isAltKey);
							break;
						case 'zoomRectangleImage' :
							updateImageNavigation(event, mPt, zVal, isAltKey);
							break;
						case 'createLabelSimple' : // New Field of View, Text, or Counter label.
							if (Z.labelMode == 'fieldofview') { self.setEditModeLabel('view'); }
							break;
						case 'createControlPoint' :
							if (Z.labelMode == 'freehand') {
								self.setEditModeLabel('freehand'); // Resetting disables mousemove to allow panel interactions function properly. 
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
					if (Z.mousePan) { self.updateView(); }
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
					if (Z.mousePan) { self.updateView(); }
					break;					
			}
		}	
	}
	
	// Consolidates event type. Supported values: 'start', 'move', 'end', 'gesturestart', 'gesturechange', 'gestureend', 'pinchstart', 'pinchchange', 'pinchend'.
	function getZoomifyEvent (event) {
		var eventType = event.type;
		var multiTouch = (event.touches && event.touches.length > 1);
		var zoomifyEvent = null;
		
		if (eventType == 'gesturestart' || eventType == 'gesturechange' || eventType == 'gestureend') {
			if (smoothPanInterval) { smoothPanStop(); }
			zoomifyEvent = eventType;
			
		} else if (!gestureInterval) {
		
			if ((eventType == 'mousedown' || eventType == 'touchstart') && !pinchInterval) {
				if (!multiTouch) {
					zoomifyEvent = 'start';
				} else {
					if (smoothPanInterval) { smoothPanStop(); }
					zoomifyEvent = 'pinchstart';
				}
				
			} else if (eventType == 'mousemove' || eventType == 'touchmove') {
				if (!multiTouch && !wasGesturing && !wasPinching) {
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
		
		if (Z.interactive) {
			if (!hotspots && (Z.clickZoom || Z.clickPan || Z.mousePan)) {
				// No annotations, skip editing conditions.
				zAction = 'navigateImage';
				
			} else {
				// If annotations exist and editing is possible, label or control point targets are possible.
				var editingPermitted = (typeof Z.externalEditPermissionFunction !== 'function' || Z.externalEditPermissionFunction());
				var editingReady = (Z.editMode !== null || Z.labelMode == 'measure');
				var editingEnabled = (!isAltKey && (Z.editing == 'addLabel' || Z.editing == 'editLabel'));
				var editingOn = (editingPermitted && editingReady && editingEnabled);

				// Test if target is existing label.
				var hotspotTarget = getTargetHotspot(target);
				var controlPointCurrent = getTargetControlPoint(clickPt, Z.labelMode);
				if (hotspotTarget !== null && controlPointCurrent === null && polygonComplete) {
					var editableLabel = self.getLabelEditable(hotspotTarget.internalID);
					if (editingOn && editableLabel) {
						zAction = 'editLabel';
					} else if (editingPermitted && Z.labelClickSelect) {
						zAction = 'selectLabel';
					}

				// Test if target is existing control point. Edit or complete. Control points only present if a label is current and editable.
				} else if (controlPointCurrent !== null && (editingOn || (!editingOn && Z.labelMode == 'measure'))) {
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
					if (Z.labelMode == 'fieldofview' || Z.labelMode == 'text' || Z.labelMode == 'counter') {
						zAction = 'createLabelSimple';
					} else if (Z.labelMode == 'shape') {
						zAction = 'createLabelShape';
					} else if (polygonComplete  && Z.editing != 'editLabel' && (Z.labelMode == 'freehand' || Z.labelMode == 'polygon' || Z.labelMode == 'measure')) {
						zAction = 'createLabelAndControlPoint';
					}
					if (Z.labelMode != 'counter') { newLabelCounter = 1; }

				// Test completing open polygon label or creating new control point.
				} else if (newLabelCounter != 0 && !polygonComplete) {
					if (isAltKey) {
						zAction = 'completeLabelPolygon';
					} else {
						zAction = 'createControlPoint';
					}

				// Secondary default action target is zoom rectangle control point.
				} else if (Z.labelMode == 'view' && isAltKey && Z.zoomRectangle) {
					zAction = 'zoomRectangleImage';

				// Default action target is image.	
				} else if (Z.clickZoom || Z.clickPan || Z.mousePan) {
					if (!isAltKey && Z.labelMode != 'view') { self.setEditModeLabel('view', null, null, null, false, null); }
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
	
	function createZoomRectangle (clickPt) {
		zoomRectangleDragging = true;
		var zValStr = (self.getZoom() * 100).toString();
		zoomRectanglePriorID = hotspotCurrentID;
		hotspotCurrentID = (hotspots.length).toString();
		var polygonPts = [{ x:clickPt.x, y:clickPt.y }, { x:clickPt.x + 1, y:clickPt.y }, { x:clickPt.x + 1, y:clickPt.y + 1 }, { x:clickPt.x, y:clickPt.y + 1 }];
		self.createHotspotFromParameters('zoomRectangle', null, 'polygon', 'polygon', null, clickPt.x.toString(), clickPt.y.toString(), zValStr, null, null, null, null, null, '0', '0', null, null, null, null, null, null, captionTextColor, null, selectedLineColor, null, null, null, null, null, null, '8', '0', hotspotCurrentID, '0', null, null, '1', polygonPts, null, null, null, null, '1', null, null, null, null, null, null, null);
		controlPointCurrent = 2;		
		if (hS.display == 'none' || eS.display == 'none' || dS.display == 'none') {
			hS.display = eS.display = dS.display = 'inline-block';
			Z.Utils.addEventListener(hotspotDisplay, 'mousedown', Z.Utils.preventDefault);
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
				if (!Z.measureVisible && !Z.tour && !Z.hotspots && !Z.annotations) {
					hS.display = eS.display = dS.display = 'none';
					Z.Utils.removeEventListener(hotspotDisplay, 'mousedown', Z.Utils.preventDefault);
				}
				if (!clear) { self.zoomAndPanToZoomRectangle(zoomRectanglePts); }
			}
		}
	}
	
	function updateSavePoint (event, clickPt) {
		var controlPointCurrent = (((Z.labelMode == 'shape' || Z.labelMode == 'polygon' || Z.labelMode == 'measure') && hotspotCurrentID !== null) || (Z.labelMode == 'shape' && hotspotCurrentID === null)) ?  getTargetControlPoint(clickPt, Z.labelMode) : null;
		if (Z.editing == 'addLabel' && ((Z.labelMode == 'shape' && controlPointCurrent === null) || Z.labelMode == 'freehand')) {
			self.saveEditsLabel(true, false, false);
		}
	}
	
	function updateLabelPositionInHTML (event, posPt, zEvent) {
		if (zEvent == 'start') {
			var viewportDisplayClickPt = self.convertPageCoordsToViewportDisplayCoords(event.clientX, event.clientY);
			hotspotDragging.mouseXPrior = posPt.x;
			hotspotDragging.mouseYPrior = posPt.y;
			hotspotDragging.mouseXOffset = viewportDisplayClickPt.x - parseFloat(hotspotDragging.style.left);
			hotspotDragging.mouseYOffset = viewportDisplayClickPt.y - parseFloat(hotspotDragging.style.top);
			hotspotDragging.style.zIndex = hotspots.length + 1;
		} else if (zEvent == 'move') {
			hotspotDragging.style.left = parseFloat(hotspotDragging.style.left) + posPt.x - hotspotDragging.mouseXPrior + 'px';
			hotspotDragging.style.top = parseFloat(hotspotDragging.style.top) + posPt.y - hotspotDragging.mouseYPrior + 'px';
			hotspotDragging.mouseXPrior = posPt.x;
			hotspotDragging.mouseYPrior = posPt.y;			
		} else if (zEvent == 'end') {		
			hotspotDragging.style.zIndex = hotspotDragging.zIndex;
			hotspotDragging = null;
		}
	}

	this.updateAnnotationPanelForNewLabel = function () {
		var newLabel = labelListDP[labelListDP.length - 1];
		populateLabels(newLabel.poiID, newLabel.value);
		if (!Z.annotationsAddMultiple) { Z.editing = 'editLabel'; }
	}
	
	function showFOVAnimation () {
		eCtx.save();
		eCtx.beginPath();
		eCtx.strokeStyle = '#FFFFFF';
		eCtx.lineWidth = 1;
		eCtx.globalAlpha = 0.5;
		var boxX = 0, boxY = 0, boxW = 0, boxH = 0;		
		var fovAnimInterval = window.setInterval(
			function () { 
				Z.Utils.clearCanvas(eD);
				eCtx.beginPath();
				eCtx.rect(boxX, boxY, boxW, boxH);
				eCtx.stroke();
				if (boxW < viewW && boxH < viewH) {
					boxX -= 5;
					boxY -= 5;
					boxW += 10;
					boxH += 10;
				} else {
					Z.Utils.clearCanvas(eD);
					window.clearInterval(fovAnimInterval);
					drawFOVBorder(null, null);
					eCtx.restore();
				}
			}, 3);
	}

	function drawFOVBordersAll () {
		if (Z.editMode !== null) {
			var hC = new HotspotContext();
			for (var i = 0, j = hotspots.length; i < j; i++) {
				var hotspot = hotspots[i];
				if (hotspot.mediaType == 'fieldofview') { drawFOVBorder(hotspot, hC); }
			}
		}
	}
	
	function drawFOVBorder (hotspot, hC) {
		eCtx.save();
		var w, h, x, y, lineW;
		if (typeof hotspot === 'undefined' || hotspot === null) {
			w = viewW - 5;
			h = viewH - 5;
			x = -w / 2;
			y = -h / 2;
			lineW = 5;
		} else {
			if (hotspot.w == 0) { hotspot.w = viewW - 5; }
			if (hotspot.h == 0) { hotspot.h = viewH - 5; }
			var transX = (hotspot.x - Z.imageX) * Z.imageZ;
			var transY = (hotspot.y - Z.imageY) * Z.imageZ;
			var zoomDelta = hC.currentZ / (hotspot.z / 100);
			var scaleDelta = tierScale / tierScalePrior;
			var scale = zoomDelta / scaleDelta;
			w = (hotspot.w - 5) * scale;
			h = (hotspot.h - 5) * scale;
			x = transX - w / 2;
			y = transY - h / 2;					
			lineW = 5 * scale;
		}
		eCtx.beginPath();
		eCtx.strokeStyle = (hotspot && hotspot.highlight) ? Z.Utils.getResource('DEFAULT_LABELHIGHLIGHTCOLOR') : Z.Utils.getResource('DEFAULT_LABELFOVBORDERCOLOR');
		eCtx.lineWidth = (hotspot && hotspot.highlight) ? lineW * 3 : lineW;
		eCtx.globalAlpha = (hotspot && hotspot.highlight) ? 1: 0.5;
		eCtx.rect(x, y, w, h);
		eCtx.stroke();
		eCtx.restore();
	}

	function updateCurrentLabel (id, clearHandlers) {
		if (hotspotCurrentID && id) {
		
			// Update editing mode.
			var index = Z.Utils.arrayIndexOfObjectValue(hotspots, 'internalID', id);
			if (index != -1) {
				var hotspot = hotspots[index];
				if (hotspot.editable) {
					if (Z.labelMode != hotspot.mediaType && Z.editMode !== null) {
						self.setEditModeLabel(hotspot.mediaType, true, hotspot.media, true, clearHandlers);
					}
				} else {
					self.setEditModeLabel('view');
				}
			}

			if (hotspotCurrentID != id) {
			
				// Save point for Cancel to return to but do not post to XML with self.saveEditsLabel(true, true, 'label'); as that is for the Save button to call or would interfere with alt-click-drag.
				savePoint('save', 'labels');

				// Update annotation panel data.
				if (hotspot) { populatePOIs(hotspot.poiID, hotspot.internalID); }

				// Debug option: Z.setCallback('labelSelectedInViewportGetIDs', function (param1, param2) { alert('id: ' + param1 + ', internalID: ' + param2); } );
				Z.Utils.validateCallback('labelSelectedInViewportGetIDs');
			}

		}
		// If hotspot or tour list, with title, unset current selection and set to title.
		if (hotspotList && (Z.hotspotListTitle || Z.tourListTitle)) { hotspotList.selectedIndex = 0; }
	}

	function createPolygonPoints (clickPt) {
		var polygonPts = [];
		polygonPts[0] = { x:clickPt.x, y:clickPt.y };
		return polygonPts;
	}
	
	function updateImageNavigation (event, mPt, zVal, isAltKey) {
		document.mousemove = null;
		document.mouseup = null;
		var dragTimeEnd = new Date().getTime();
		var dragPtEnd;													
		if (!Z.mouseOutDownPoint) {
			dragPtEnd = new Z.Utils.Point(mPt.x, mPt.y);
		} else {
			dragPtEnd = Z.mouseOutDownPoint;
		}		
		clickPt = self.getClickCoordsInImage(event, zVal, Z.mouseOutDownPoint);
		var dragDist = Z.Utils.calculatePointsDistance(dragPtStart.x, dragPtStart.y, dragPtEnd.x, dragPtEnd.y);
		var dragDuration = dragTimeEnd - dragTimeStart;
		
		var thresholdDistance = (!Z.mobileDevice) ? MOUSECLICK_THRESHOLD_VIEWPORT : TOUCHTAP_THRESHOLD_VIEWPORT;
		var thresholdTime = (!Z.mobileDevice) ? MOUSECLICK_THRESHOLD_TIME_VIEWPORT : TOUCHTAP_THRESHOLD_TIME_VIEWPORT;
		if ((dragDist < thresholdDistance && dragDuration < thresholdTime) || (!isAltKey && (Z.labelMode == 'shape' || Z.labelMode == 'freehand'))) {

			if (Z.clickZoom || Z.clickPan) {
				var doubleClick = (clickTimer && Z.doubleClickZoom) ? true : false;
				var clickPtZoom = self.getClickZoomCoords3D(event, dragPtStart, tierCurrent, tierScale, doubleClick);
			}
			if (Z.clickZoom) {
				if (!Z.doubleClickZoom) {
					// DEV NOTE: Timeout in line below is placeholder workaround for caption anchor failure in Firefox necessary if not implementing single-click delay below.
					var viewerDisplayMouseUpClickZoomTimer = window.setTimeout( function () { self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z); }, 1);

				} else {
					if (!clickTimer) { // First click, delay and wait for second click.
						clickTimer = setTimeout(function(event) {
							clickTimer = null;
							self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z);
						}, Z.doubleClickDelay);

					} else { // Second click.
						clearTimeout(clickTimer);
						clickTimer = null;
						self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, clickPtZoom.z);
					}
				}

			} else if (Z.clickPan) {
				self.zoomAndPanToView(clickPtZoom.x, clickPtZoom.y, Z.imageZ);
			}
			updateZoomRectangle(hotspotCurrentID, controlPointCurrent, clickPt, true, true);
				
		} else {
			if (Z.labelMode == 'view' && (isAltKey || Z.altKeyIsDown) && Z.zoomRectangle) {
				updateZoomRectangle(hotspotCurrentID, controlPointCurrent, clickPt, true);
			} else if (Z.mousePan && !Z.smoothPan) {
				dragPtCurrent = null;
				self.updateView();
			}
		}
	}

	function smoothPanStart (newPan) {
	 	if (Z.smoothPanEasing > 1) {
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
		if (!Z.animation || self.getZoom() != Z.minZ) {
			smoothPanStep();
		} else {
			smoothAnimateStep();
		}
	}

	function smoothPanStep () {
		// Get current display position.
		var displayCurrL = parseFloat(cS.left);
		var displayCurrT = parseFloat(cS.top);

		if (Z.mouseIsDown || smoothPanGliding) {

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
				var easingMore = (smoothPanGliding) ? Z.smoothPanGlide : 1;
				var easingEndLess = (smoothPanGliding) ? 1 : 100;
				smoothPanDeltaX = Math.round((((deltaMouseX - deltaDisplayX) / (Z.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);
				smoothPanDeltaY = Math.round((((deltaMouseY - deltaDisplayY) / (Z.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);

				// If dragging track deltas, if gliding use last tracked deltas to constrain glide deltas.
				if (Z.mouseIsDown) {
					smoothPanLastDeltaX = smoothPanDeltaX;
					smoothPanLastDeltaY = smoothPanDeltaY;
				} else {
					if (Math.abs(smoothPanDeltaX) > Math.abs(smoothPanLastDeltaX)) { smoothPanDeltaX = smoothPanLastDeltaX; }
					if (Math.abs(smoothPanDeltaY) > Math.abs(smoothPanLastDeltaY)) { smoothPanDeltaY = smoothPanLastDeltaY; }
				}

				// Constrain and implement new position and if effect constrained, also apply constraint to delta values.
				var newL = displayCurrL + smoothPanDeltaX;
				var newT = displayCurrT + smoothPanDeltaY;
				var constrainedPt = constrainPan(newL, newT, Z.imageZ, Z.imageR, 'container');
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
				var currentCenterPt = self.calculateCurrentCenterCoordinates(constrainedPt, Z.imageZ, Z.imageR);
				if (!Z.comparison || viewportID == 0) {
					if (Z.Navigator) { Z.Navigator.syncNavigatorRectangleToViewport(currentCenterPt); }
				}
				
				// Validate callbacks for view change.
				Z.Utils.validateCallback('viewChanging');
				Z.Utils.validateCallback('viewPanningGetCurrentCoordinates');
				Z.Utils.validateCallback('viewChangingGetCurrentCoordinatesFull');
			}

		} else if (!Z.mouseIsDown && smoothPanGliding === null && smoothPanDeltaX != 0 && smoothPanDeltaY != 0) {
			// Calculate and record extended pan endpoint to enable drag-glide.
			var testL = displayCurrL + smoothPanLastDeltaX;
			var testT = displayCurrT + smoothPanLastDeltaY;
			var constrainedPt = constrainPan(testL, testT, Z.imageZ, Z.imageR, 'container');
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
			self.updateView();
		}
	}

	// For simplicity and to support future optimization, the following animation step function is based on the above pan step function.
	// Frame rate based on drag motion or drag position depending on value in animation XML.  Setting 'motion' recommended for spinning
	// objects, and 'position' recommended for pivoting panoramas. Horizontal and vertical dragging supported by value in animation XML.
	// To increase animation rate, interval speed is prioritized over frame count (speed over smoothness) by skipping frames rather than
	// changes in frames. However, skipping frame changes (intervals) is prioritized over skipping frames where changes in frame content
	// are significant such as with pivoting panoramas ('position' setting used) or when image sets are small in total number of images.
	function smoothAnimateStep (event) {
		Z.animationCount++;

		// Prepare lagging position variable.
		if (smoothAnimationX === null) { smoothAnimationX = parseFloat(cS.left); }
		if (smoothAnimationY === null) { smoothAnimationY = parseFloat(cS.top); }
		var displayCurrL = smoothAnimationX;
		var displayCurrT = smoothAnimationY;

		if (Z.mouseIsDown || smoothPanGliding) {
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
				var easingMore = (smoothPanGliding) ? Z.smoothPanGlide : 1;
				var easingEndLess = (smoothPanGliding) ? 1 : 100;
				smoothPanDeltaX = Math.round((((deltaMouseX - deltaDisplayX) / (Z.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);
				smoothPanDeltaY = Math.round((((deltaMouseY - deltaDisplayY) / (Z.smoothPanEasing * easingMore)) * easingEndLess) / easingEndLess);

				// If dragging track deltas, if gliding use last tracked deltas to constrain glide deltas.
				if (Z.mouseIsDown) {
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
				if (Z.animator == 'motion') {
					deltaAnimationAxis = (Z.animationAxis == 'horizontal') ? smoothPanDeltaX : smoothPanDeltaY;
					dimensionAxis = (Z.animationAxis == 'horizontal') ? viewW : viewH;
					skipCalls = Math.round(optimalMotionImages / Z.imageSetLength);
					skipFrames = (deltaAnimationAxis / 40);
					animationGap = 0;
				} else if (Z.animator == 'position') {
					deltaAnimationAxis = (Z.animationAxis == 'horizontal') ? deltaDisplayX : deltaDisplayY;
					dimensionAxis = (Z.animationAxis == 'horizontal') ? viewW : viewH;
					skipCalls = Math.max(0, Math.round(((dimensionAxis / 2) - Math.abs(deltaAnimationAxis)) / optimalPositionDelta));
					skipFrames = 0;
					animationGap = (Z.animationAxis == 'horizontal') ? viewW / 10 : viewH /10;
				}
				if (skipCalls == 0) { skipCalls++; } // Variable represents number of calls to skip but is used as divisor so base value must be 1.

				// Implement frame change.
				if (Z.animationCount % skipCalls == 0) {
					if (deltaAnimationAxis < -animationGap) {
						Z.Viewer.viewportPrior(skipFrames);
					} else if (deltaAnimationAxis > animationGap) {
						Z.Viewer.viewportNext(skipFrames);
					}
				}

				// Set gliding variable false if delta variable reaches zero to finish glide. Complemented by test in viewportEventsManager in mouseup event.
				if (smoothPanGliding && Math.round(smoothPanDeltaX * easingEndLess) / easingEndLess == 0 && Math.round(smoothPanDeltaY * easingEndLess) / easingEndLess == 0) {
					smoothPanGliding = false;
				}
			}

		} else if (!Z.mouseIsDown && smoothPanGliding === null && smoothPanDeltaX != 0 && smoothPanDeltaY != 0) {
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
	
	function directPan (mPt) {
		// In direct pan mode. Pan image if no image set or zoomed in, otherwise animate by changing Viewport.
		if (!Z.animation || self.getZoom() != Z.minZ) {

			// Calculate change in mouse position.
			var deltaX = mPt.x - cD.mouseXPrior;
			var deltaY = mPt.y - cD.mouseYPrior;

			if (!isNaN(deltaX) && !isNaN(deltaY)) {

				// Calculate new position of displays container.
				var newL = parseFloat(cS.left) + deltaX;
				var newT = parseFloat(cS.top) + deltaY;

				// Constrain new position.
				var constrainedPt = constrainPan(newL, newT, Z.imageZ, Z.imageR, 'container');
				cS.left = constrainedPt.x + 'px';
				cS.top = constrainedPt.y + 'px';

				// Update stored page coordinates for next call to this function.
				cD.mouseXPrior = mPt.x;
				cD.mouseYPrior = mPt.y;

				// Implement oversize backfill if required.
				var deltaX = constrainedPt.x - displayL;
				var deltaY = constrainedPt.y - displayT;
				if (oD && tierBackfillDynamic && (Z.mobileDevice || (Math.abs(deltaX) > (viewW / 2) || Math.abs(deltaY) > (viewH / 2)))) {
					redisplayCachedTiles(oD, tierBackfillOversize, tilesBackfillCached, 'simple', false, 'Updating backfill oversize display');
				}

				// Sync navigator rectangle if visible.
				var currentCenterPt = self.calculateCurrentCenterCoordinates(constrainedPt, Z.imageZ, Z.imageR);
				if (Z.Navigator) { Z.Navigator.syncNavigatorRectangleToViewport(currentCenterPt); }

			} else {
				if (mPt.x > cD.mouseXPrior) {
					Z.Viewer.viewportNext();
				} else if (mPt.x < cD.mouseXPrior) {
					Z.Viewer.viewportPrior();
				}

				// Update stored page coordinates for next call to this function.
				cD.mouseXPrior = mPt.x;
				cD.mouseYPrior = mPt.y;
			}				
		}
	}

	function viewerDisplayGestureChangeHandler (event) {
		var event = Z.Utils.event(event);
		event.preventDefault();
		gestureIntervalPercent = Math.round(event.scale * 100) / 100;
	}

	function zoomGesture (event) {
		var sync = false;
		if (!Z.clickZoom) { return; }  // Disallow touch zooming if parameter false.
		var gestureZoom = calculateGestureZoom(tierCurrent, tierScalePrior, gestureIntervalPercent);
		var gestureZoomConstrained = constrainZoom(gestureZoom);
		if (gestureZoomConstrained != Z.imageZ) { sync = self.scaleTierToZoom(gestureZoomConstrained); }
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
		if (!Z.clickZoom) { return; }  // Disallow touch zooming if parameter false.
		var pinchZoom = calculatePinchZoom(tierCurrent, tierScalePrior, pinchIntervalPercent);
		var pinchZoomConstrained = constrainZoom(pinchZoom);
		if (pinchZoomConstrained != Z.imageZ) { sync = self.scaleTierToZoom(pinchZoomConstrained); }
	}

	function calculatePinchZoom (tier, scale, pinchPercent) {
		var newScale = scale * pinchPercent;
		var pinchZ = convertTierScaleToZoom(tier, newScale);
		return pinchZ;
	}

	// This is executed on change into and also out of full screen mode, and is needed because
	// browsers assign their own change event listener that will fire on entry as well as exit.
	this.fullScreenEscapeHandler = function (event) {
		if (Z.fullScreenEntering) {
			Z.fullScreenEntering = false;
		} else {
			self.toggleFullViewMode(false, true);
		}
	}

	this.mouseWheelHandler = function (delta, isAltKey) {
		Z.mouseWheelIsDown = true;
		if (Z.mouseWheelCompleteTimer) { window.clearTimeout(Z.mouseWheelCompleteTimer); }
		Z.mouseWheelCompleteTimer = window.setTimeout(Z.Viewer.mouseWheelCompleteHandler, Z.mouseWheelCompleteDuration);

		if (Z.sliderFocus == 'zoom' && !(Z.imageSet && isAltKey)) {
			// Calculate current step, then target zoom based on step and target scale for current step.
			// Constrain target zoom and scale viewport display to implement.
			var stepZ = (delta > 0) ? zoomStepDistance : -zoomStepDistance;
			var targetScale = tierScale *  (1 + stepZ);
			var targetZoom = self.convertTierScaleToZoom(tierCurrent, targetScale);
			constrainedZ = constrainZoom(targetZoom);
			if (constrainedZ != Z.imageZ) {
				Z.zooming = (delta > 0) ? 'in' : (delta < 0) ? 'out' : 'stop';
				var sync = self.scaleTierToZoom(constrainedZ);
			}
			// Debug option: console.log('targetScale: ' + targetScale);

		} else if (Z.sliderFocus == 'imageSet' || isAltKey) {
			// Simple increment or decrement with degree of view updating handled in function updateView.
			if (delta > 0) {
				Z.Viewer.viewportNext();
			} else if (delta < 0) {
				Z.Viewer.viewportPrior();
			}
		}
	}

	function displayEventsCoordinatesHandler (event) {
		var event = Z.Utils.event(event);
		if (event) {
			var coordsString;
			if (Z.geoCoordinatesVisible) {
				coordsString = '';
				if (geoTop && geoBottom && geoLeft && geoRight) {
					var coordsPixelPt = self.getClickCoordsInImage(event);
					coordsString = convertPixelsToLatitudeLongitudeString(coordsPixelPt);
				}
			} else if (Z.tileSource == 'IIIFImageServer') {
				var coordsPixelPt = self.getClickCoordsInImage(event);
				if (event.type == 'mousemove') {
					coordsString = self.getViewCoordinatesIIIFString(null, coordsPixelPt, 'show');
				} else if (event.type == 'mousedown' && event.altKey) {
					coordsString = self.getViewCoordinatesIIIFString(null, coordsPixelPt, 'save') + '\n';
				}
			} else {
				coordsString = getClickZoomCoords3DAsString(event);
			}

			if (event.type == 'mousemove') {
				Z.Utils.showCoordinates(coordsString);
			} else if (event.type == 'mousedown' && event.altKey) {
				Z.Utils.saveCoordinates(coordsString);
			}
		}
	}
};



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::: TOOLBAR FUNCTIONS ::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.ZoomifyToolbar = function (tbViewport) {

	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::: INIT FUNCTIONS :::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Declare variables for toolbar internal self-reference and for initialization completion.
	var self = this;
	var isInitialized = false;
	var tbViewportIDStr = (tbViewport) ? tbViewport.getViewportID().toString() : '0';

	if (!Z.toolbarInternal) {

		// Load toolbar skins XML file and determine selection mode setting for optional support of
		// small screen devices with large graphic files. Build names list for needed skin files.
		Z.skinPath = Z.Utils.stringRemoveTrailingSlash(Z.skinPath);
		var netConnector = new Z.NetConnector();
		netConnector.loadXML(Z.skinPath + '/' + Z.Utils.getResource('DEFAULT_SKINXMLFILE'), null, 'loadingSkinXML');

		// Declare variables for Toolbar and slider.
		var tlbrH, tbS, trS, btS;
		var toolbarSkinArray = [], toolbarDimensions = [], toolbarSkinFilePaths = [], toolbarSkinSizes = [];
		var SLIDERTESTDURATION_ZOOM = parseInt(Z.Utils.getResource('DEFAULT_SLIDERTESTDURATIONZOOM'), 10);
		var buttonSliderZoomDown = false;
		var sliderIntervalZoom = null, sliderIntervalMousePtZoom = null;
		var progressInterval = null, progressTextColor = null;
		var overrideSliderZoom, overrideProgress, overrideLogo, overridePan, overrideReset;

		// Declare variables for imageSet slider.
		if (Z.imageSet) {
			var SLIDERTESTDURATION_IMAGESET = parseInt(Z.Utils.getResource('DEFAULT_SLIDERTESTDURATIONIMAGESET'), 10);
			var buttonSliderImageSetDown = false;
			var sliderIntervalImageSet = null, sliderIntervalMousePtImageSet = null;
			var overrideSliderImageSet;
		}

		// Declare variables for image filter panel.
		if (Z.imageFilters) {
			var SLIDERTESTDURATION_FILTER = parseInt(Z.Utils.getResource('DEFAULT_SLIDERTESTDURATIONFILTER'), 10);
			var buttonSliderFilterDown = false;
			var sliderIntervalFilter = null, sliderIntervalMousePtFilter = null;
		}

	} else {
		var buttonZoomInInternalS, buttonResetInternalS, buttonZoomOutInternalS;
		var colorButtonInternalOver = Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONOVERCOLOR');
		var colorButtonInternalDown = Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONDOWNCOLOR');
		var colorButtonInternalUp = Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONUPCOLOR');
		initializeToolbarSimple();
	}

	function initializeToolbarSimple () {
		var backAlpha = parseFloat(Z.Utils.getResource('UI_TOOLBARINTERNALBACKGROUNDALPHA'));
		var backColor = Z.Utils.getResource('UI_TOOLBARINTERNALBACKGROUNDCOLOR');
		var buttonColor = Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONUPCOLOR');
		var width = 100;
		var height = 25;
		var left = (Z.viewerW / 2 - width / 2);
		var top = (Z.viewerH - height - 10);
		var btnW = Math.round(width / 4);
		var btnH = Math.round(height / 1.5);
		var gapL = (width - (btnW * 3)) / 4;
		var gapT = (height - btnH) / 2;

		Z.ToolbarDisplay = Z.Utils.createContainerElement('div', 'ToolbarDisplay', 'inline-block', 'absolute', 'visible', width + 'px', height + 'px', left + 'px', top + 'px', 'none', '0px', 'transparent none', '0px', '0px', 'normal');
		tbS = Z.ToolbarDisplay.style;

		//Alternative implementation: with background. Use with opacity of 0.4 on 3 buttons below.
		/*var toolbarBackgroundInternal = Z.Utils.createContainerElement('div', 'toolbarBackgroundInternal', 'inline-block', 'absolute', 'visible', width + 'px', height + 'px', '0px', '0px', 'solid', '1px', backColor, '0px', '0px', 'normal');
		Z.Utils.setOpacity(toolbarBackgroundInternal, backAlpha, backColor);
		Z.ToolbarDisplay.appendChild(toolbarBackgroundInternal);
 		toolbarBackgroundInternal.style.borderRadius='4px';*/

		var buttonZoomOutInternal = Z.Utils.createContainerElement('div', 'buttonZoomOutInternal', 'inline-block', 'absolute', 'visible', btnW + 'px', btnH + 'px', (gapL + 1) + 'px', gapT + 1 +'px', 'none', '0px', buttonColor, '0px', '0px', 'normal');
		Z.Utils.setOpacity(buttonZoomOutInternal, 0.6, backColor);
		buttonZoomOutInternal.setAttribute('title', Z.Utils.getResource('TIP_ZOOMOUT'));
		var textNodeZO = document.createTextNode(Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONZOOMOUTTEXT'));
		buttonZoomOutInternal.appendChild(textNodeZO);
		Z.ToolbarDisplay.appendChild(buttonZoomOutInternal);
		buttonZoomOutInternalS = buttonZoomOutInternal.style;
		buttonZoomOutInternalS.borderRadius='3px';
		Z.Utils.setTextNodeStyle(textNodeZO, 'black', 'verdana', '15px', 'none', 'normal', 'normal', 'normal', 'bold', '1em', 'center', 'none');
		Z.Utils.disableTextInteraction(textNodeZO);

		var buttonResetInternal = Z.Utils.createContainerElement('div', 'buttonResetInternal', 'inline-block', 'absolute', 'visible', btnW + 'px', btnH + 'px', (gapL * 2 + btnW) + 1 + 'px', gapT + 1 + 'px', 'none', '0px', buttonColor, '0px', '0px', 'normal');
		Z.Utils.setOpacity(buttonResetInternal, 0.6, backColor);
		buttonResetInternal.setAttribute('title', Z.Utils.getResource('TIP_RESET'));
		var textNodeR = document.createTextNode(Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONRESETTEXT'));
		buttonResetInternal.appendChild(textNodeR);
		Z.ToolbarDisplay.appendChild(buttonResetInternal);
		buttonResetInternalS = buttonResetInternal.style;
		buttonResetInternalS.borderRadius='3px';
		Z.Utils.setTextNodeStyle(textNodeR, 'blue', 'verdana', '15px', 'none', 'normal', 'normal', 'normal', 'bold', '1em', 'center', 'none');
		Z.Utils.disableTextInteraction(textNodeR);

		var buttonZoomInInternal = Z.Utils.createContainerElement('div', 'buttonZoomInInternal', 'inline-block', 'absolute', 'visible', btnW + 'px', btnH + 'px', (gapL * 3 + btnW * 2) + 1 + 'px', gapT + 1 + 'px', 'none', '0px', buttonColor, '0px', '0px', 'normal');
		Z.Utils.setOpacity(buttonZoomInInternal, 0.6, backColor);
		buttonZoomInInternal.setAttribute('title', Z.Utils.getResource('TIP_ZOOMIN'));
		var textNodeZI = document.createTextNode(Z.Utils.getResource('UI_TOOLBARINTERNALBUTTONZOOMINTEXT'));
		buttonZoomInInternal.appendChild(textNodeZI);
		Z.ToolbarDisplay.appendChild(buttonZoomInInternal);
		buttonZoomInInternalS = buttonZoomInInternal.style;
		buttonZoomInInternalS.borderRadius='3px';
		Z.Utils.setTextNodeStyle(textNodeZI, 'black', 'verdana', '15px', 'none', 'normal', 'normal', 'normal', 'bold', '1em', 'center', 'none');
		Z.Utils.disableTextInteraction(textNodeZI);

		Z.Utils.addEventListener(buttonZoomOutInternal, 'mouseover', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomOutInternal, 'mousedown', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomOutInternal, 'mouseup', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomOutInternal, 'mouseout', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomOutInternal, 'touchstart', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomOutInternal, 'touchend', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomOutInternal, 'touchcancel', buttonEventsHandlerInternal);
		
		Z.Utils.addEventListener(buttonResetInternal, 'mouseover', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonResetInternal, 'mousedown', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonResetInternal, 'mouseup', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonResetInternal, 'mouseout', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonResetInternal, 'touchstart', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonResetInternal, 'touchend', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonResetInternal, 'touchcancel', buttonEventsHandlerInternal);
						
		Z.Utils.addEventListener(buttonZoomInInternal, 'mouseover', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomInInternal, 'mousedown', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomInInternal, 'mouseup', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomInInternal, 'mouseout', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomInInternal, 'touchstart', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomInInternal, 'touchend', buttonEventsHandlerInternal);
		Z.Utils.addEventListener(buttonZoomInInternal, 'touchcancel', buttonEventsHandlerInternal);
				
		// Ensure proper z-ordering of Viewer elements.
		tbS.zIndex = (Z.baseZIndex + 2).toString();

		// Add toolbar to viewer display.
		Z.ViewerDisplay.appendChild(Z.ToolbarDisplay);

		// Prevent event bubbling.
		Z.Utils.addEventListener(Z.ToolbarDisplay, 'mouseover', Z.Utils.stopPropagation);

		setInitialized(true);
	}

	function initializeToolbar (tlbrSknDims, tlbrSknArr) {
		toolbarSkinArray = tlbrSknArr;
		// Create Toolbar display area for Toolbar buttons and set size and position.
		Z.ToolbarDisplay = Z.Utils.createContainerElement('div', 'ToolbarDisplay', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '1px', 'none', '0px', 'transparent', '0px', '0px', 'normal');
		tbS = Z.ToolbarDisplay.style;
		tbS.textAlign = 'left'; // Dev Note: this workaround prevents containing aligns from affecting positioning of Toolbar button graphics.

		// Ensure proper z-ordering of Viewer elements.
		tbS.zIndex = (Z.baseZIndex + 3).toString();

		var toolbarBackground = new Z.Utils.Graphic('toolbarBackground', Z.skinPath, tlbrSknArr[0], '1px', '1px', '0px', '0px');
		var backAlpha = parseFloat(Z.Utils.getResource('DEFAULT_BACKGROUNDALPHA'));
		var backColorNoAlpha = Z.Utils.getResource('DEFAULT_BACKGROUNDCOLORNOALPHA');
		Z.ToolbarDisplay.appendChild(toolbarBackground.elmt);
		if (!Z.toolbarBackgroundVisible) { Z.Utils.setOpacity(toolbarBackground.elmt, 0, backColorNoAlpha); }

		// DEV NOTE: Optional transparent toolbar background. No parameter in current release, requires skin file review.
		//Z.Utils.setOpacity(toolbarBackground.elmt, backAlpha, backColorNoAlpha);

		// Create toolbar global array to hold skin sizes from XML but use placeholders here
		// and apply actual sizes in drawLayout function called in setSizeAndPosition function.
		toolbarSkinSizes = tlbrSknDims;

		if (Z.logoVisible) {
			var toolbarLogo;
			if (!(Z.Utils.stringValidate(Z.logoCustomPath))) {
				toolbarLogo = new Z.Utils.Graphic('toolbarLogo', Z.skinPath, tlbrSknArr[7], '1px', '1px', '1px', '1px');
			} else {
				var logoPath = Z.Utils.cacheProofPath(Z.logoCustomPath);
				toolbarLogo = new Z.Utils.Graphic('toolbarLogo', logoPath, null, '1px', '1px', '1px', '1px');
			}

			// Zoomify values required for Free product, parameter value used if not set to 'none'.
			var logoURL = Z.Utils.getResource('UI_LOGOLINKZOOMIFY');
			var logoTip = Z.Utils.getResource('TIP_LOGOZOOMIFY');
			if (Z.expressParamsEnabled && Z.logoLinkURL !== null) {
				if (Z.logoLinkURL == 'none') {
					logoURL = null;
					logoTip = null;
				} else {
					logoURL = Z.logoLinkURL;
					if (Z.logoLinkURL.toLowerCase().indexOf('zoomify') == -1) { logoTip = Z.Utils.getResource('TIP_LOGOGENERIC'); }
				}
			}
			if (logoURL !== null && logoTip !== null) {
				var zLogoAnchor = document.createElement('a');
				zLogoAnchor.setAttribute('title', logoTip);
				zLogoAnchor.setAttribute('href', logoURL);
				zLogoAnchor.setAttribute('target', Z.Utils.getResource('UI_LOGOLINKTARGET'));
				zLogoAnchor.setAttribute('outline', 'none');
				zLogoAnchor.appendChild(toolbarLogo.elmt);
				Z.ToolbarDisplay.appendChild(zLogoAnchor);
			} else {
				Z.ToolbarDisplay.appendChild(toolbarLogo.elmt);
			}

			if (Z.toolbarVisible == 0 || Z.toolbarVisible == 1) {
				var logoDivider = new Z.Utils.Graphic('logoDivider', Z.skinPath, tlbrSknArr[8], '1px', '1px', '1px', '1px');
				Z.ToolbarDisplay.appendChild(logoDivider.elmt);
			}
		}

		// Add button container to handle background mouseover events instead of button mouseout events.
		var buttonContainer = Z.Utils.createContainerElement('div', 'buttonContainer', 'inline-block', 'absolute', 'visible', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal', 'default');
		Z.ToolbarDisplay.appendChild(buttonContainer);
		Z.Utils.addEventListener(buttonContainer, 'mousedown', Z.Utils.preventDefault);
		Z.Utils.addEventListener(buttonContainer, 'mouseover', self.backgroundEventsHandler);
		Z.Utils.addEventListener(buttonContainer, 'touchstart', Z.Utils.preventDefault);

		// Add background graphic to button container to ensure IE events fire.
		var buttonBackground = new Z.Utils.Graphic('buttonBackground', Z.skinPath, tlbrSknArr[0], '1px', '1px', '0px', '0px');
		buttonContainer.appendChild(buttonBackground.elmt);

		// DEV NOTE: Zero opacity avoids interfering with option to set opacity of of toolbarBackground above.
		Z.Utils.setOpacity(buttonBackground.elmt, '0', '#FBFAFA');

		if (((Z.toolbarVisible != 0 && Z.toolbarVisible != 1) || Z.mobileDevice) && Z.minimizeVisible) {
			var buttonMinimize = new Z.Utils.Button('buttonMinimize', null, Z.skinPath, tlbrSknArr[9], tlbrSknArr[10], tlbrSknArr[11], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_MINIMIZE');
			Z.ToolbarDisplay.appendChild(buttonMinimize.elmt);
			var buttonExpand = new Z.Utils.Button('buttonExpand', null, Z.skinPath, tlbrSknArr[12], tlbrSknArr[13], tlbrSknArr[14], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_EXPAND');
			Z.ToolbarDisplay.appendChild(buttonExpand.elmt);
		}

		if (Z.zoomButtonsVisible) {
			var buttonZoomOut = new Z.Utils.Button('buttonZoomOut', null, Z.skinPath, tlbrSknArr[1], tlbrSknArr[2], tlbrSknArr[3], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_ZOOMOUT');
			buttonContainer.appendChild(buttonZoomOut.elmt);
		}

		if (Z.sliderZoomVisible) {
			var trackSliderZoom = new Z.Utils.Graphic('trackSliderZoom', Z.skinPath, tlbrSknArr[15], '1px', '1px', '0px', '0px', 'TIP_SLIDERZOOM');
			buttonContainer.appendChild(trackSliderZoom.elmt);
			Z.Utils.addEventListener(trackSliderZoom.elmt, 'mousedown', buttonEventsHandler);
			Z.Utils.addEventListener(trackSliderZoom.elmt, 'touchstart', buttonEventsHandler);
			Z.Utils.addEventListener(trackSliderZoom.elmt, 'mouseover', buttonEventsHandler);
			var buttonSliderZoom = new Z.Utils.Button('buttonSliderZoom', null, Z.skinPath, tlbrSknArr[17], tlbrSknArr[18], tlbrSknArr[19], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_SLIDERZOOM');
			buttonContainer.appendChild(buttonSliderZoom.elmt);
			var trsZ, trszS, btsZ, btszS;
		}

		if (Z.zoomButtonsVisible) {
			var buttonZoomIn = new Z.Utils.Button('buttonZoomIn', null, Z.skinPath, tlbrSknArr[4], tlbrSknArr[5], tlbrSknArr[6], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_ZOOMIN');
			buttonContainer.appendChild(buttonZoomIn.elmt);
		}

		if (Z.panButtonsVisible) {
			if (Z.zoomButtonsVisible || Z.sliderZoomVisible) {
				var panDivider = new Z.Utils.Graphic('panDivider', Z.skinPath, tlbrSknArr[20], '1px', '1px','1px', '1px');
				buttonContainer.appendChild(panDivider.elmt);
				if (!Z.toolbarBackgroundVisible) { Z.Utils.setOpacity(panDivider.elmt, 0, backColorNoAlpha); }
			}
			var buttonPanLeft = new Z.Utils.Button('buttonPanLeft', null, Z.skinPath, tlbrSknArr[21], tlbrSknArr[22], tlbrSknArr[23], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANLEFT');
			buttonContainer.appendChild(buttonPanLeft.elmt);
			var buttonPanUp = new Z.Utils.Button('buttonPanUp', null, Z.skinPath, tlbrSknArr[24], tlbrSknArr[25], tlbrSknArr[26], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANUP');
			buttonContainer.appendChild(buttonPanUp.elmt);
			var buttonPanDown = new Z.Utils.Button('buttonPanDown', null, Z.skinPath, tlbrSknArr[27], tlbrSknArr[28], tlbrSknArr[29], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANDOWN');
			buttonContainer.appendChild(buttonPanDown.elmt);
			var buttonPanRight = new Z.Utils.Button('buttonPanRight', null, Z.skinPath, tlbrSknArr[30], tlbrSknArr[31], tlbrSknArr[32], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PANRIGHT');
			buttonContainer.appendChild(buttonPanRight.elmt);
		}
		if (Z.resetVisible) {
			var buttonReset = new Z.Utils.Button('buttonReset', null, Z.skinPath, tlbrSknArr[33], tlbrSknArr[34], tlbrSknArr[35], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_RESET');
			buttonContainer.appendChild(buttonReset.elmt);
		}

		if (Z.fullScreenVisible || Z.fullPageVisible) {
			var fullViewDivider = new Z.Utils.Graphic('fullViewDivider', Z.skinPath, tlbrSknArr[36], '1px', '1px', '1px', '1px');
			buttonContainer.appendChild(fullViewDivider.elmt);
			if (!Z.toolbarBackgroundVisible) { Z.Utils.setOpacity(fullViewDivider.elmt, 0, backColorNoAlpha); }
			var buttonFullViewExit = new Z.Utils.Button('buttonFullViewExit', null, Z.skinPath, tlbrSknArr[40], tlbrSknArr[41], tlbrSknArr[42], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOGGLEFULLVIEWEXIT');
			buttonContainer.appendChild(buttonFullViewExit.elmt);
			var buttonFullView = new Z.Utils.Button('buttonFullView', null, Z.skinPath, tlbrSknArr[37], tlbrSknArr[38], tlbrSknArr[39], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOGGLEFULLVIEW');
			buttonContainer.appendChild(buttonFullView.elmt);
		}

		if (Z.measureVisible && Z.editMode === null) {
			if (!Z.fullScreenVisible && !Z.fullPageVisible) {
				var measureDivider = new Z.Utils.Graphic('measureDivider', Z.skinPath, tlbrSknArr[36], '1px', '1px', '1px', '1px');
				buttonContainer.appendChild(measureDivider.elmt);
				if (!Z.toolbarBackgroundVisible) { Z.Utils.setOpacity(measureDivider.elmt, 0, backColorNoAlpha); }
			}
			if (Z.editMode === null) {
				var buttonMeasureExit = new Z.Utils.Button('buttonMeasureExit', null, Z.skinPath, tlbrSknArr[49], tlbrSknArr[50], tlbrSknArr[51], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOGGLEMEASURINGEXIT');
				buttonContainer.appendChild(buttonMeasureExit.elmt);
			}
			var buttonMeasure = new Z.Utils.Button('buttonMeasure', null, Z.skinPath, tlbrSknArr[46], tlbrSknArr[47], tlbrSknArr[48], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOGGLEMEASURING');
			buttonContainer.appendChild(buttonMeasure.elmt);
		}

		if (Z.rotationVisible) {
			var rotateDivider = new Z.Utils.Graphic('rotateDivider', Z.skinPath, tlbrSknArr[52], '1px', '1px', '1px', '1px');
			buttonContainer.appendChild(rotateDivider.elmt);
			if (!Z.toolbarBackgroundVisible) { Z.Utils.setOpacity(rotateDivider.elmt, 0, backColorNoAlpha); }
			var buttonRotateCounterwise = new Z.Utils.Button('buttonRotateCounterwise', null, Z.skinPath, tlbrSknArr[53], tlbrSknArr[54], tlbrSknArr[55], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_ROTATECOUNTERWISE');
			buttonContainer.appendChild(buttonRotateCounterwise.elmt);
			var buttonRotateClockwise = new Z.Utils.Button('buttonRotateClockwise', null, Z.skinPath, tlbrSknArr[56], tlbrSknArr[57], tlbrSknArr[58], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_ROTATECLOCKWISE');
			buttonContainer.appendChild(buttonRotateClockwise.elmt);
		}

		if (Z.tour) {
			var tourDivider = new Z.Utils.Graphic('tourDivider', Z.skinPath, tlbrSknArr[59], '1px', '1px', '1px', '1px');
			buttonContainer.appendChild(tourDivider.elmt);
			if (!Z.toolbarBackgroundVisible) { Z.Utils.setOpacity(tourDivider.elmt, 0, backColorNoAlpha); }
			var buttonTourPrior = new Z.Utils.Button('buttonTourPrior', null, Z.skinPath, tlbrSknArr[60], tlbrSknArr[61], tlbrSknArr[62], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOURPRIOR');
			buttonContainer.appendChild(buttonTourPrior.elmt);
			var buttonTourNext = new Z.Utils.Button('buttonTourNext', null, Z.skinPath, tlbrSknArr[63], tlbrSknArr[64], tlbrSknArr[65], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOURNEXT');
			buttonContainer.appendChild(buttonTourNext.elmt);
			var buttonTourStart = new Z.Utils.Button('buttonTourStart', null, Z.skinPath, tlbrSknArr[66], tlbrSknArr[67], tlbrSknArr[68], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOURSTART');
			buttonContainer.appendChild(buttonTourStart.elmt);
			var buttonTourStop = new Z.Utils.Button('buttonTourStop', null, Z.skinPath, tlbrSknArr[69], tlbrSknArr[70], tlbrSknArr[71], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_TOURSTOP');
			buttonContainer.appendChild(buttonTourStop.elmt);
		}

		if (Z.slideshow && Z.slideButtonsVisible) {
			var slideshowDivider = new Z.Utils.Graphic('slideshowDivider', Z.skinPath, tlbrSknArr[59], '1px', '1px', '1px', '1px');
			buttonContainer.appendChild(slideshowDivider.elmt);
			if (!Z.toolbarBackgroundVisible) { Z.Utils.setOpacity(slideshowDivider.elmt, 0, backColorNoAlpha); }
			var buttonSlideshowPrior = new Z.Utils.Button('buttonSlideshowPrior', null, Z.skinPath, tlbrSknArr[60], tlbrSknArr[61], tlbrSknArr[62], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_SLIDEPRIOR');
			buttonContainer.appendChild(buttonSlideshowPrior.elmt);
			var buttonSlideshowNext = new Z.Utils.Button('buttonSlideshowNext', null, Z.skinPath, tlbrSknArr[63], tlbrSknArr[64], tlbrSknArr[65], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_SLIDENEXT');
			buttonContainer.appendChild(buttonSlideshowNext.elmt);
			var buttonSlideshowStart = new Z.Utils.Button('buttonSlideshowStart', null, Z.skinPath, tlbrSknArr[66], tlbrSknArr[67], tlbrSknArr[68], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_SLIDESHOWSTART');
			buttonContainer.appendChild(buttonSlideshowStart.elmt);
			var buttonSlideshowStop = new Z.Utils.Button('buttonSlideshowStop', null, Z.skinPath, tlbrSknArr[69], tlbrSknArr[70], tlbrSknArr[71], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_SLIDESHOWSTOP');
			buttonContainer.appendChild(buttonSlideshowStop.elmt);
		}

		if (Z.tour || Z.slideshow) {
			var buttonAudioOn = new Z.Utils.Button('buttonAudioOn', null, Z.skinPath, tlbrSknArr[72], tlbrSknArr[73], tlbrSknArr[74], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_AUDIOMUTE');
			buttonContainer.appendChild(buttonAudioOn.elmt);
			var buttonAudioMuted = new Z.Utils.Button('buttonAudioMuted', null, Z.skinPath, tlbrSknArr[75], tlbrSknArr[76], tlbrSknArr[77], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_AUDIOON');
			buttonContainer.appendChild(buttonAudioMuted.elmt);
		}

		if (Z.imageSet && !Z.overlays) {
			if (buttonContainer.childNodes.length > 1) {
				var imageSetDivider = new Z.Utils.Graphic('imageSetDivider', Z.skinPath, tlbrSknArr[59], '1px', '1px', '1px', '1px');
				buttonContainer.appendChild(imageSetDivider.elmt);
				if (!Z.toolbarBackgroundVisible) { Z.Utils.setOpacity(imageSetDivider.elmt, 0, backColorNoAlpha); }
			}
			var buttonImageSetPrior = new Z.Utils.Button('buttonImageSetPrior', null, Z.skinPath, tlbrSknArr[60], tlbrSknArr[61], tlbrSknArr[62], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_IMAGESETPRIOR');
			buttonContainer.appendChild(buttonImageSetPrior.elmt);

			if (Z.sliderImageSetVisible) {
				var trackSliderImageSet = new Z.Utils.Graphic('trackSliderImageSet', Z.skinPath, tlbrSknArr[15], '1px', '1px', '0px', '0px', 'TIP_SLIDERIMAGESET');
				buttonContainer.appendChild(trackSliderImageSet.elmt);
				Z.Utils.addEventListener(trackSliderImageSet.elmt, 'mousedown', buttonEventsHandler);
				Z.Utils.addEventListener(trackSliderImageSet.elmt, 'touchstart', buttonEventsHandler);
				Z.Utils.addEventListener(trackSliderImageSet.elmt, 'mouseover', buttonEventsHandler);
				var buttonSliderImageSet = new Z.Utils.Button('buttonSliderImageSet', null, Z.skinPath, tlbrSknArr[17], tlbrSknArr[18], tlbrSknArr[19], '1px', '1px', '1px', '1px',  'mouseover', buttonEventsHandler, 'TIP_SLIDERIMAGESET');
				buttonContainer.appendChild(buttonSliderImageSet.elmt);
				var trsiS, trsisS, btsiS, btsisS;
			}

			var buttonImageSetNext = new Z.Utils.Button('buttonImageSetNext', null, Z.skinPath, tlbrSknArr[63], tlbrSknArr[64], tlbrSknArr[65], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_IMAGESETNEXT');
			buttonContainer.appendChild(buttonImageSetNext.elmt);
		}

		if (Z.preloadVisible) {
			var preloadDivider = new Z.Utils.Graphic('preloadDivider', Z.skinPath, tlbrSknArr[59], '1px', '1px', '1px', '1px');
			buttonContainer.appendChild(preloadDivider.elmt);
			if (!Z.toolbarBackgroundVisible) { Z.Utils.setOpacity(preloadDivider.elmt, 0, backColorNoAlpha); }
			var buttonPreload = new Z.Utils.Button('buttonPreload', null, Z.skinPath, tlbrSknArr[69], tlbrSknArr[70], tlbrSknArr[71], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_PRELOAD');
			buttonContainer.appendChild(buttonPreload.elmt);
		}

		if (Z.comparison) {
			var labelSyncTextBox = Z.Utils.createContainerElement('div', 'labelSyncTextBox', 'inline-block', 'absolute', 'hidden', '1px', '1px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'nowrap', null, true);
			var labelSyncTextNode = document.createTextNode(Z.Utils.getResource('UI_TOOLBARLABELSYNC'));
			labelSyncTextBox.appendChild(labelSyncTextNode);
			var checkboxSyncComparison = new Z.Utils.Checkbox('checkboxSyncComparison', 'test', '1px', '1px', '1px', '1px', 'click', buttonEventsHandler, 'TIP_SYNC');
			buttonContainer.appendChild(labelSyncTextBox);
			buttonContainer.appendChild(checkboxSyncComparison);
		}

		if (Z.helpVisible == 1 || Z.helpVisible == 3) {
			var buttonHelp = new Z.Utils.Button('buttonHelp', null, Z.skinPath, tlbrSknArr[43], tlbrSknArr[44], tlbrSknArr[45], '1px', '1px', '1px', '1px', 'mouseover', buttonEventsHandler, 'TIP_HELP');
			buttonContainer.appendChild(buttonHelp.elmt);
		}

		if (Z.progressVisible) {
			// Create with placeholder size and position until drawLayout.
			var progressTextBox = Z.Utils.createContainerElement('div', 'progressTextBox', 'inline-block', 'absolute', 'hidden', '1px', '1px', '1px', '1px', 'none', '0px', 'transparent', '0px', '0px', 'normal', null, true);
			var progressFontSize=toolbarSkinSizes[16];
			buttonContainer.appendChild(progressTextBox);
			var progressTextNode = document.createTextNode(Z.Utils.getResource('DEFAULT_PROGRESSTEXT'));
			progressTextBox.appendChild(Z.Utils.createCenteredElement(progressTextNode, 'progressTextBoxCenteredDiv'));
			if (progressTextColor === null) { progressTextColor = Z.Utils.getResource('DEFAULT_PROGRESSTEXTCOLOR'); }
			Z.Utils.setTextNodeStyle(progressTextNode, progressTextColor, 'verdana', progressFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
			Z.Utils.disableTextInteraction(progressTextNode); // Prevent text selection.
		}

		// Add toolbar to viewer display.
		Z.ViewerDisplay.appendChild(Z.ToolbarDisplay);

		// Set toolbar size, position, and visibility.
		Z.toolbarW = toolbarSkinSizes[0];
		Z.toolbarCurrentW = (Z.toolbarW == -1) ? Z.viewerW : Z.toolbarW;
		Z.toolbarH = tlbrH = toolbarSkinSizes[1];
		
		var toolbarTopAdj = (!Z.toolbarBackgroundVisible) ? parseInt(Z.Utils.getResource('DEFAULT_TOOLBARBACKGROUNDVISIBLEADJUST'), 10) : 0;
		var toolbarTop = (Z.toolbarPosition == 1) ? Z.viewerH - Z.toolbarH - toolbarTopAdj : 0 + toolbarTopAdj;
			
		self.setSizeAndPosition(Z.toolbarCurrentW, Z.toolbarH, 0, toolbarTop);

		if (tbViewport && tbViewport.getStatus('initializedViewport')) {
			if (Z.toolbarVisible == 1 && Z.toolbarBackgroundVisible) {
				var viewH = Z.viewerH - Z.toolbarH;
				var viewT = (Z.toolbarPosition == 0) ? Z.toolbarH : 0;
				tbViewport.setSizeAndPosition(Z.viewerW, viewH, 0, viewT);
				tbViewport.validateXYZDefaults(true);
				tbViewport.updateView(); // DEV NOTE: Review requirement for this refresh in static toolbar contexts.
			}
			var currentZ = tbViewport.getZoom();
			syncSliderToViewportZoom(currentZ);
			if (Z.annotations) { tbViewport.setDrawingColor('buttonColor0' + tbViewportIDStr, true); }
		}

		show(Z.toolbarVisible == 1 || Z.toolbarVisible == 2 || Z.toolbarVisible == 4 || Z.toolbarVisible == 7);

		// Prevent event bubbling.
		Z.Utils.addEventListener(Z.ToolbarDisplay, 'mouseover', Z.Utils.stopPropagation);

		setInitialized(true);

		// Reset size and position Gallery, if present.
		gallerySizeAndPositionReset();
	}

	this.gallerySizeAndPositionReset = function () {
		gallerySizeAndPositionReset();
	}

	function gallerySizeAndPositionReset () {
		if (Z.Gallery && Z.Gallery.getInitialized()) {
			Z.Gallery.setSizeAndPosition();
		} else {
			var galleryPositionTimer = window.setTimeout( gallerySizeAndPositionReset, 100);
		}
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
			vpIDs = (Z.annotationFileShared) ? '0' : tbViewport.getViewportID().toString();
		}
		var annotPanel = document.getElementById('AnnotationPanelDisplay' + vpIDs);
		if (annotPanel) {
			if (visible && (!(Z.measureVisible && Z.editMode === null && !(Z.annotationPanelVisible == 1 || Z.annotationPanelVisible == 2)) || Z.narrative)) {
				annotPanel.style.display = 'inline-block';
				Z.annotationPanelVisibleState = true;
			} else {
				annotPanel.style.display = 'none'; // Debug option: comment out this line to keep visible on mouseout.
				Z.annotationPanelVisibleState = false;
			}
		}
	}

	this.showProgress = function () {
		var ptB = document.getElementById('progressTextBox');
		if (ptB) {
			var ptbS = ptB.style;
			if (ptbS) {
				ptbS.display = 'inline-block';
			}
		}
	}

	this.hideProgress = function () {
		var ptB = document.getElementById('progressTextBox');
		if (ptB) {
			var ptbS = ptB.style;
			if (ptbS) {
				ptbS.display = 'none';
			}
		}
	}

	this.updateProgress = function (total, current) {
		if (Z.progressVisible) {
			if (progressInterval) { window.clearInterval(progressInterval); }
			var percentComplete;
			var ptcD = document.getElementById('progressTextBoxCenteredDiv');
			if (ptcD) {
				var ptn = ptcD.firstChild;
				if (ptn) {
					if (total == 0 || current == 0) {
						ptn.nodeValue = 'llllllllll'
						progressInterval = window.setInterval(clearProgress, parseInt(Z.Utils.getResource('DEFAULT_PROGRESSDURATION')), 10);
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
		var ptcD = document.getElementById('progressTextBoxCenteredDiv');
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
			Z.Utils.validateCallback('toolbarInitialized');
			Z.Viewer.validateViewerReady('toolbarInitialized');
		}
	}

	this.parseSkinXML = function (xmlDoc) {
		// Get selection mode for optional small screen graphics fileset.
		Z.skinMode = (Z.narrative) ? Z.skinMode = '2' : xmlDoc.getElementsByTagName('SETUP')[0].attributes.getNamedItem('SKINMODE').nodeValue;
		var skinFolder, skinSizesTag;

		// Debug option - forces large skins for mobile device layout testing:
		//Z.skinMode = 2;

		if (Z.skinMode == 1 || (Z.skinMode == 0 && !Z.mobileDevice)) {
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
		skinMax = (Z.imageFilters) ? 216 : (Z.trackingEditMode == 'edit') ? 200 : (Z.tracking) ? 188 : (Z.narrativeMode) ? 182 : (Z.editMode == 'edit') ? 141 : (Z.editMode == 'markup') ? 132 : (Z.screensaver || Z.preloadVisible || Z.tourPath || Z.slidePath || Z.imageSetPath) ? 77 : (Z.rotationVisible) ? 58 : (Z.measureVisible) ? 51 : (Z.helpVisible > 0) ? 45 : (Z.fullScreenVisible || Z.fullPageVisible) ? 45 : (Z.resetVisible) ? 35 : (Z.panButtonsVisible) ? 32 : (Z.sliderZoomVisible) ? 19 : (Z.minimizeVisible) ? 14 : (Z.logoVisible) ? 8 : 6;
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
			if (xmlMissingNames) { Z.Utils.showMessage(Z.Utils.getResource('ERROR_SKINXMLMISSINGNAMES')); }
			initializeToolbar(toolbarSkinSizes, toolbarSkinFilePaths);
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_SKINXMLINVALID'));
		}
	}

	this.setSizeAndPosition = function (width, height, left, top) {
		if (typeof width === 'undefined' || width === null) {
			width = (Z.toolbarVisible > 0) ? Z.toolbarCurrentW : 0;
		} else {
			Z.toolbarCurrentW = width;
		}
		if (typeof height === 'undefined' || height === null) { height = (Z.toolbarVisible > 0 && Z.toolbarVisible != 8) ? tlbrH : 0; }
		if (typeof left === 'undefined' || left === null) { left = 0; }
		if (typeof top === 'undefined' || top === null) { top = (Z.toolbarPosition == 1) ? Z.viewerH - tlbrH : 0; }

		if (Z.narrative) {
			width -= Z.narrativeW;
			left += Z.narrativeW;
		}

		tbS = Z.ToolbarDisplay.style;
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
		var dx = (Z.narrative) ? 10: 0;
		var logoTOffset = (toolbarH - logoH) / 2;
		var dvdrTOffset = (toolbarH - dvdrH) / 2;
		var btnTOffset = (toolbarH - btnH) / 2;
		var btnMinExpTOffset = (Z.narrative) ? (btnTOffset) : (btnTOffset * 1.3);
		var offsetNarrAdj = (Z.narrative) ? 3 : 0; // Neccessary due to smaller button height but equal toolbar height in default Narratives skinFiles.xml file.
		var sldrTrkTOffset = btnTOffset + 6 - offsetNarrAdj;
		var btnSldrTOffset = btnTOffset + 5 - offsetNarrAdj;
		var btnMinSpan = (Z.logoVisible == 1) ? 0 : btnSpan / 2;
		var btnExpSpan = (Z.logoVisible == 1) ? 0 : btnSpan / 2;
		var dvdrSpan = btnSpan - (btnW - dvdrW);
		var btnContainerMargin = 20;

		// Calculate width of button area.
		var btnCount = 0;
		var dvdrCount = 0;

		if (Z.zoomButtonsVisible) {
			btnCount += 2;
		}
		if (Z.panButtonsVisible) {
			btnCount += 4;
			dvdrCount += 1;
		}
		if (Z.resetVisible) {
			btnCount += 1;
		}
		if (Z.fullScreenVisible || Z.fullPageVisible) {
			btnCount += 1;
			dvdrCount += 1;
		}
		if (Z.helpVisible) {
			btnCount += 1;
			if (!Z.fullScreenVisible && !Z.fullPageVisible) {
				dvdrCount += 1;
			}
		}
		if (Z.measureVisible) {
			if (!Z.fullScreenVisible && !Z.fullPageVisible) {
				dvdrCount += 1;
			}
			btnCount += 1;
		}
		if (Z.rotationVisible) {
			btnCount += 2;
			dvdrCount += 1;
		}
		if (Z.tour || (Z.slideshow && Z.slideButtonsVisible)) {
			btnCount += 3;
			dvdrCount += 1;
			if (Z.audioContent) {
				btnCount += 1;	// DEV NOTE: Does not currently allow for timing of toolbar initialization vs viewer initialization and tour/slideshow XML parsing.
			}
		}
		if (Z.preloadVisible) {
			btnCount += 1;
			dvdrCount += 1;
		}
		if (Z.comparison && Z.syncVisible) {
			btnCount += 1;
			dvdrCount += 1;
		}

		if (Z.imageSet && Z.sliderImageSetVisible) {
			// Following values separate from standard toolbar slider values for possible separate future use.
			var sldrStackSpan = sldrSpan;
			var imageSetSldrTrkW = sldrTrkW;
			var imageSetSldrTrkH = sldrTrkH;
			overrideSliderImageSet = false;
			btnCount += 2;
		}

		if (!Z.progressVisible) { prgW = 0; }

		var btnSetW = (btnCount * btnSpan) + (dvdrCount * dvdrSpan);

		if (Z.sliderZoomVisible) { btnSetW += sldrSpan; }
		if (Z.imageSet && Z.sliderImageSetVisible) { btnSetW += sldrStackSpan; }

		// Validate toolbar contents fit within toolbar width. If not, implement overrides. First
		// hide slider and recalculate. Next hide, progress display.  Next, hide logo and
		// minimize and maximize buttons. Finally, hide pan buttons.
		overrideSliderZoom = overrideProgress = overrideLogo = overridePan = overrideZoom = false;
		var logoOffset = (Z.logoVisible == 1) ? logoW + 2 : 0;
		var minBtnOffset = (Z.toolbarVisible != 0 && Z.toolbarVisible != 1 && Z.minimizeVisible != 0) ? btnSpan : 0;
		var logoButtonSetW = logoOffset + minBtnOffset;
		var panButtonSetW = (Z.panButtonsVisible == 1) ? (btnSpan * 4) + dvdrSpan : 0;
		var zoomButtonSetW = (Z.zoomButtonsVisible == 1) ? (btnSpan * 2) : 0;
		var resetButtonW = (Z.resetVisible == 1) ? btnSpan : 0;
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
		var bG = document.getElementById('toolbarBackground');
		if (bG) {
			bG.style.width = toolbarW + 'px';
			bG.style.height = toolbarH + 'px';
			bG.firstChild.style.width = toolbarW + 'px';
			bG.firstChild.style.height = toolbarH + 'px';
		}

		var bC = document.getElementById('buttonContainer');
		if (bC) {
			bC.style.width = (btnSetW + (btnContainerMargin * 2)) + 'px';
			bC.style.height = toolbarH + 'px';
			bC.style.left = btnSetL + 'px';
		}

		var bB = document.getElementById('buttonBackground');
		if (bB) {
			bB.style.width = toolbarW + 'px';
			Z.Utils.graphicSize(bB, parseFloat(bC.style.width), parseFloat(bC.style.height));
			bB.style.left = '0px';
		}

		var tbL = document.getElementById('toolbarLogo');
		if (tbL) {
			var tblS = tbL.style;
			if (tblS) {
				if (!overrideLogo) {
					tblS.display = 'inline-block';
					Z.Utils.graphicSize(tbL, logoW, logoH);
					tblS.left = dx + 'px';
					tblS.top = logoTOffset + 'px';
					dx += logoW + 5;
					var logoD = document.getElementById('logoDivider');
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

		if (Z.toolbarVisible != 0 && Z.toolbarVisible != 1) {
			var bM = document.getElementById('buttonMinimize');
			var bE = document.getElementById('buttonExpand');
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
			var bZO = document.getElementById('buttonZoomOut');
			if (bZO) {
				Z.Utils.buttonSize(bZO, btnW, btnH);
				var bzoS = bZO.style;
				bzoS.left = dx + 'px';
				bzoS.top = btnTOffset + 'px';
				dx += btnSpan;
			}
			trsZ = document.getElementById('trackSliderZoom');
			btsZ = document.getElementById('buttonSliderZoom');
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
			var bZI = document.getElementById('buttonZoomIn');
			if (bZI) {
				Z.Utils.buttonSize(bZI, btnW, btnH);
				var bziS = bZI.style;
				bziS.left = dx + 'px';
				bziS.top = btnTOffset + 'px';
				dx += btnSpan + 1;
			}
		}

		if (!overridePan) {
			var pnD = document.getElementById('panDivider');
			if (pnD) {
				Z.Utils.graphicSize(pnD, dvdrW, dvdrH);
				var pndS = pnD.style;
				pndS.left = dx + 'px';
				pndS.top = dvdrTOffset - 5 + 'px';
				dx += dvdrSpan;
			}
			var bPL = document.getElementById('buttonPanLeft');
			if (bPL) {
				Z.Utils.buttonSize(bPL, btnW, btnH);
				var bplS = bPL.style;
				bplS.left = dx + 'px';
				bplS.top = btnTOffset + 'px';
				dx += btnSpan;
			}
			var bPU = document.getElementById('buttonPanUp');
			if (bPU) {
				Z.Utils.buttonSize(bPU, btnW, btnH);
				var bpuS = bPU.style;
				bpuS.left = dx + 'px';
				bpuS.top = btnTOffset + 'px';
				dx += btnSpan;
			}
			var bPD = document.getElementById('buttonPanDown');
			if (bPD) {
				Z.Utils.buttonSize(bPD, btnW, btnH);
				var bpdS = bPD.style;
				bpdS.left = dx + 'px';
				bpdS.top = btnTOffset + 'px';
				dx += btnSpan;
			}
			var bPR = document.getElementById('buttonPanRight');
			if (bPR) {
				Z.Utils.buttonSize(bPR, btnW, btnH);
				var bprS = bPR.style;
				bprS.left = dx + 'px';
				bprS.top = btnTOffset + 'px';
				dx += btnSpan;
			}
		}
		if (!overrideReset) {
			var bR = document.getElementById('buttonReset');
			if (bR) {
				Z.Utils.buttonSize(bR, btnW, btnH);
				var brS = bR.style;
				brS.left = dx + 'px';
				brS.top = btnTOffset + 'px';
				dx += btnSpan + 1;
			}
		}

		var fvD = document.getElementById('fullViewDivider');
		if (fvD) {
			Z.Utils.graphicSize(fvD, dvdrW, dvdrH);
			var fvdS = fvD.style;
			fvdS.left = dx + 'px';
			fvdS.top = dvdrTOffset + 'px';
			dx += dvdrSpan;
		}
		var bFVE = document.getElementById('buttonFullViewExit');
		if (bFVE) {
			Z.Utils.buttonSize(bFVE, btnW, btnH);
			var bfveS = bFVE.style;
			bfveS.left = dx + 'px';
			bfveS.top = btnTOffset + 'px';

			// Set full view or full view exit button visible based on full view status.
			bfveS.display = (Z.fullView) ? 'inline-block' : 'none';
		}
		var bFV = document.getElementById('buttonFullView');
		if (bFV) {
			Z.Utils.buttonSize(bFV, btnW, btnH);
			var bfvS = bFV.style;
			bfvS.left = dx + 'px';
			bfvS.top = btnTOffset + 'px';
			dx += btnSpan + 1;

			// Set measure or measure exit button visible based on full view status.
			bfvS.display = (Z.fullView) ? 'none' : 'inline-block';
		}

		var mD = document.getElementById('measureDivider');
		if (mD) {
			Z.Utils.graphicSize(mD, dvdrW, dvdrH);
			var mdS = mD.style;
			mdS.left = dx + 'px';
			mdS.top = dvdrTOffset + 'px';
			dx += dvdrSpan;
		}
		if (Z.editMode === null) {
			var bME = document.getElementById('buttonMeasureExit');
			if (bME) {
				Z.Utils.buttonSize(bME, btnW, btnH);
				var bmeS = bME.style;
				bmeS.left = dx + 'px';
				bmeS.top = btnTOffset + 'px';

				// Set measure or measure exit button visible based on measuring status.
				bmeS.display = (Z.labelMode == 'measure') ? 'inline-block' : 'none';
			}
		}
		var bM = document.getElementById('buttonMeasure');
		if (bM) {
			Z.Utils.buttonSize(bM, btnW, btnH);
			var bmS = bM.style;
			bmS.left = dx + 'px';
			bmS.top = btnTOffset + 'px';
			dx += btnSpan + 1;

			// Set measure or measure exit button visible based on measuring status.
			bmS.display = (Z.labelMode == 'measure') ? 'none' : 'inline-block';
		}

		var rD = document.getElementById('rotateDivider');
		if (rD ) {
			Z.Utils.graphicSize(rD, dvdrW, dvdrH);
			var rdS = rD.style;
			rdS.left = dx + 'px';
			rdS.top = dvdrTOffset + 'px';
			dx += dvdrSpan;
			var bRCCW = document.getElementById('buttonRotateCounterwise');
			if (bRCCW) {
				Z.Utils.buttonSize(bRCCW, btnW, btnH);
				var brccwS = bRCCW.style;
				brccwS.left = dx + 'px';
				brccwS.top = btnTOffset + 'px';
				dx += btnSpan;
			}
			var bRCW = document.getElementById('buttonRotateClockwise');
			if (bRCW) {
				Z.Utils.buttonSize(bRCW, btnW, btnH);
				var brcwS = bRCW.style;
				brcwS.left = dx + 'px';
				brcwS.top = btnTOffset + 'px';
				dx += btnSpan + 1;
			}
		}

		// Add either tour or slideshow buttons.
		if (Z.tour) {
			var trD = document.getElementById('tourDivider');
			if (trD) {
				Z.Utils.graphicSize(trD, dvdrW, dvdrH);
				var trdS = trD.style;
				trdS.left = dx + 'px';
				trdS.top = dvdrTOffset + 'px';
				dx += dvdrSpan;
				var bTP = document.getElementById('buttonTourPrior');
				if (bTP) {
					Z.Utils.buttonSize(bTP, btnW, btnH);
					var btpS = bTP.style;
					btpS.left = dx + 'px';
					btpS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
				var bTN = document.getElementById('buttonTourNext');
				if (bTN) {
					Z.Utils.buttonSize(bTN, btnW, btnH);
					var btnS = bTN.style;
					btnS.left = dx + 'px';
					btnS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
				var bTRS = document.getElementById('buttonTourStop');
				if (bTRS) {
					Z.Utils.buttonSize(bTRS, btnW, btnH);
					var btrsS = bTRS.style;
					btrsS.left = dx + 'px';
					btrsS.top = btnTOffset + 'px';

					// Set start or stop button visible based on tour playing status.
					btrsS.display = (Z.tourPlaying) ? 'inline-block' : 'none';
				}
				// Do not increment dx so place Show button on Hide button.
				var bTRST = document.getElementById('buttonTourStart');
				if (bTRST) {
					Z.Utils.buttonSize(bTRST, btnW, btnH);
					var btrstS = bTRST.style;
					btrstS.left = dx + 'px';
					btrstS.top = btnTOffset + 'px';
					dx += btnSpan + 1;

					// Set start or stop button visible based on tour playing status.
					btrstS.display = (Z.tourPlaying) ? 'none' : 'inline-block';
				}
			}
		} else if (Z.slideshow && Z.slideButtonsVisible) {
			var sSD = document.getElementById('slideshowDivider');
			if (sSD) {
				Z.Utils.graphicSize(sSD, dvdrW, dvdrH);
				var ssdS = sSD.style;
				ssdS.left = dx + 'px';
				ssdS.top = dvdrTOffset + 'px';
				dx += dvdrSpan;
				var bSSP = document.getElementById('buttonSlideshowPrior');
				if (bSSP) {
					Z.Utils.buttonSize(bSSP, btnW, btnH);
					var bsspS = bSSP.style;
					bsspS.left = dx + 'px';
					bsspS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
				var bSSN = document.getElementById('buttonSlideshowNext');
				if (bSSN) {
					Z.Utils.buttonSize(bSSN, btnW, btnH);
					var bssnS = bSSN.style;
					bssnS.left = dx + 'px';
					bssnS.top = btnTOffset + 'px';
					dx += btnSpan + 1;
				}
				var bSSS = document.getElementById('buttonSlideshowStop');
				if (bSSS) {
					Z.Utils.buttonSize(bSSS, btnW, btnH);
					var bsssS = bSSS.style;
					bsssS.left = dx + 'px';
					bsssS.top = btnTOffset + 'px';

					// Set start or stop button visible based on slideshow playing status.
					bsssS.display = (Z.slideshowPlaying) ? 'inline-block' : 'none';
				}
				// Do not increment dx so place Show button on Hide button.
				var bSSST = document.getElementById('buttonSlideshowStart');
				if (bSSST) {
					Z.Utils.buttonSize(bSSST, btnW, btnH);
					var bssstS = bSSST.style;
					bssstS.left = dx + 'px';
					bssstS.top = btnTOffset + 'px';
					dx += btnSpan + 1;

					// Set start or stop button visible based on slideshow playing status.
					bssstS.display = (Z.slideshowPlaying) ? 'none' : 'inline-block';
				}
			}
		} else if (Z.imageSetPath !== null && !Z.comparison) {
			var iSD = document.getElementById('imageSetDivider');
			if (iSD) {
				Z.Utils.graphicSize(iSD, dvdrW, dvdrH);
				var isdS = iSD.style;
				isdS.left = dx + 'px';
				isdS.top = dvdrTOffset + 'px';
				dx += dvdrSpan;
			}
			var bISP = document.getElementById('buttonImageSetPrior');
			if (bISP) {
				Z.Utils.buttonSize(bISP, btnW, btnH);
				var bispS = bISP.style;
				bispS.left = dx + 'px';
				bispS.top = btnTOffset + 'px';
				dx += btnSpan + 1;
			}
			trsiS = document.getElementById('trackSliderImageSet');
			btsiS = document.getElementById('buttonSliderImageSet');
			if (trsiS && btsiS) {
				trsisS = trsiS.style;
				btsisS = btsiS.style;
				if (trsisS && btsisS) {
					if (!overrideSliderImageSet) {
						trsisS.display = 'inline-block';
						btsisS.display = 'inline-block';
						Z.Utils.graphicSize(trsiS, imageSetSldrTrkW, imageSetSldrTrkH);
						trsisS.left = (dx - 2) + 'px';
						trsisS.top = (sldrTrkTOffset) + 'px';
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
			var bISN = document.getElementById('buttonImageSetNext');
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
		if (Z.tour || Z.slideshow) {
			var bAM = document.getElementById('buttonAudioMuted');
			if (bAM) {
				Z.Utils.buttonSize(bAM, btnW, btnH);
				var bamS = bAM.style;
				bamS.left = dx + 'px';
				bamS.top = btnTOffset + 'px';
				bamS.display = 'none';
			}
			// Do not increment dx so place On button on Mute button.
			var bAO = document.getElementById('buttonAudioOn');
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

		if (Z.preloadVisible) {
			var pD = document.getElementById('preloadDivider');
			var bP = document.getElementById('buttonPreload');
			if (pD && bP) {
				Z.Utils.graphicSize(pD, dvdrW, dvdrH);
				var pdS = pD.style;
				pdS.top = dvdrTOffset + 'px';
				if (!Z.imageSet) {
					pdS.left = dx + 'px';
					dx += dvdrSpan;
				}
				Z.Utils.buttonSize(bP, btnW, btnH);
				var bpS = bP.style;
				bpS.left = dx + 'px';
				bpS.top = btnTOffset + 'px';
				dx += btnSpan;
				if (Z.imageSet) {
					pdS.left = dx + 'px';
					dx += dvdrSpan;
				}
				dx += 8;
			}
		}

		if (Z.helpVisible == 1 || Z.helpVisible == 3) {
			var bH = document.getElementById('buttonHelp');
			if (bH) {
				Z.Utils.buttonSize(bH, btnW, btnH);
				var bhS = bH.style;
				bhS.left = dx + 'px';
				bhS.top = btnTOffset + 'px';
				dx += btnSpan + 8;
			}
		}

	 	if (Z.comparison && Z.syncVisible) {
			var labelFontSize = parseInt(Z.Utils.getResource('DEFAULT_TOOLBARLABELFONTSIZE'), 10);
			var labelW = 28;
			var labelH = 20;
			var tbLSY = document.getElementById('labelSyncTextBox');
			var cCBSY = document.getElementById('containerFor-checkboxSyncComparison');
			var cbSY = document.getElementById('checkboxSyncComparison');
			if (tbLSY && cCBSY && cbSY) {
				var tblsyS = tbLSY.style;
				tblsyS.width = labelW + 'px';
				tblsyS.height = labelH + 'px';
				tblsyS.left = dx + 'px';
				tblsyS.top = btnTOffset + 6 + 'px'; // DEV NOTE: modify to set as comparison of button and background height.
				tblsyS.visibility = 'visible';
				Z.Utils.setTextNodeStyle(tbLSY, 'black', 'verdana', labelFontSize + 'px', 'none', 'normal', 'normal', 'normal', 'normal', '1em', 'left', 'none');
				var ccbsyS = cCBSY.style;
				ccbsyS.width = (btnW * 1.5) + 'px';
				ccbsyS.height = (btnH * 1.5) + 'px';
				ccbsyS.left = (dx + labelW + 3) + 'px';
				ccbsyS.top = btnTOffset + 2 + 'px'; // DEV NOTE: modify to set as comparison of button and background height.
				cbSY.width = btnW;
				cbSY.height = btnH;
				cbSY.checked = Z.initialSync;
			}
		}

		var ptB = document.getElementById('progressTextBox');
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

	function show (value) {
		if ((Z.toolbarVisible < 4 && !Z.mobileDevice) || Z.toolbarVisible == 8 || Z.toolbarInternal) {
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
		Z.ToolbarMinimized = value;
		if (tbS) {
			var bC = document.getElementById('buttonContainer');
			var bG = document.getElementById('toolbarBackground');
			var bM = document.getElementById('buttonMinimize');
			var bE = document.getElementById('buttonExpand');
			var logoD = document.getElementById('logoDivider');
			var minW = 0;
			if (bE && !overrideLogo) { minW = parseFloat(bE.style.left) + parseFloat(bE.style.width) + 4; }
			if (Z.imageFilters) {
				var bGF = document.getElementById('imageFilterPanelBackground');
				var bCF = document.getElementById('buttonContainerImageFilter');
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
			var imageSpan = Z.maxZ - Z.minZ;
			var sliderPercent = (imageZ - Z.minZ) / imageSpan;
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

			if (sliderZoom < Z.minZ + 0.1) { sliderZoom = Z.minZ; }
			if (sliderZoom > Z.maxZ - 0.1) { sliderZoom = Z.maxZ; }

			var delta = sliderZoom - tbViewport.getZoom();
			Z.zooming = (delta > 0) ? 'in' : (delta < 0) ? 'out' : 'stop';
			tbViewport.scaleTierToZoom(sliderZoom);
			Z.zooming = 'stop';

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
			Z.zooming = (delta > 0) ? 'in' : (delta < 0) ? 'out' : 'stop';

			tbViewport.scaleTierToZoom(sliderZoom);
		}
	}

	function sliderSlideEndZoom () {
		buttonSliderZoomDown = false;
		Z.zooming = 'stop';
		tbViewport.updateView();
	}

	function calculateSliderZoom (sliderPosition, trkL, trkR) {
		var trackSpan = trkR - trkL;
		var sliderPercent = (sliderPosition - trkL) / trackSpan;
		var imageSpan = Z.maxZ - Z.minZ;
		var sliderZoom = Z.minZ + (imageSpan * sliderPercent);
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
				var isAltKey = event.altKey;
				if (eventType == 'mousedown' || eventType == 'touchstart') { eventType = 'start'; }
				if (eventType == 'mouseup' || eventType == 'touchend' || eventType == 'touchcancel') { eventType = 'end'; }
				switch(eventType) {
					case 'mouseover' :
						eventTarget.style.background = colorButtonInternalOver;
						break;
					case 'start' :
						eventTarget.style.background = colorButtonInternalDown;
						if (tbID == 'buttonZoomInInternal') {
							if (!isAltKey) { tbViewport.zoom('in'); }
						} else if (tbID == 'buttonZoomOutInternal') {
							if (!isAltKey) { tbViewport.zoom('out'); }
						}
						break;
					case 'end' :
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
					tbID = targetBtn.id;
				}
			}
			var relatedTarget = Z.Utils.relatedTarget(event);
		}

		// Prevent conflicting zoom-and-pan function calls and clear mask, if any.
		// Implement exceptions to interruption by user interaction of ongoing processes.
		if (eventType == 'mousedown' && tbViewport && !(tbID == 'buttonMinimize' || tbID == 'buttonExpand' || tbID == 'buttonAudioOn' || tbID == 'buttonAudioMuted')) {
			tbViewport.zoomAndPanAllStop(false, true);
			if (Z.maskingSelection && Z.maskClearOnUserAction) { tbViewport.clearMask(); }
		}

		// Prevent events if optional parameter set, or if due to choicelist navigation, right-click, or copy menu on mobile OS.
		if (!Z.interactive && (eventType == 'mousedown' || eventType == 'mouseup') && (tbID != 'buttonRotateClockwise' && tbID != 'buttonRotateCounterwise')) { return; }
		if (relatedTarget && (relatedTarget == '[object HTMLSelectElement]' || relatedTarget == '[object HTMLOptionElement]')) { return; }
		if (Z.Utils.isRightMouseButton(event)) { return; }
		if (Z.touchSupport) { event.preventDefault(); }

		// If event firing on viewport if mouse dragged off slider button, reassign target to slider button to prevent buttonGraphicsUpdate function from setting visibility of viewport elements.
		if (tbID && tbID.indexOf('viewportContainer') != -1 || buttonSliderZoomDown || buttonSliderFilterDown || buttonSliderImageSetDown) {
			if (buttonSliderZoomDown) {
				targetBtn = document.getElementById('buttonSliderZoom');
			} else if (buttonSliderImageSetDown) {
				targetBtn = document.getElementById('buttonSliderImageSet');
			}
			if (targetBtn) { tbID = targetBtn.id; }
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
							Z.sliderFocus = 'zoom';
						} else if (tbID == 'buttonImageSetPrior' || tbID == 'buttonSliderImageSet' || tbID == 'buttonImageSetNext') {
							Z.sliderFocus = 'imageSet';
						}
					} else {
						Z.Utils.addEventListener(targetBtn.childNodes[0], 'mouseout', buttonEventsHandler);
						Z.sliderFocus = (tbID == 'trackSliderImageSet') ? 'imageSet' : 'zoom';
					}
					break;
				case 'mousedown' :
					Z.buttonIsDown = true;
					if (!Z.fullView && document.activeElement) { document.activeElement.blur(); }
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
					Z.buttonIsDown = false;
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
							Z.sliderFocus = (Z.mouseWheel == 2) ? 'imageSet' : 'zoom';
						}
					} else {
						Z.Utils.removeEventListener(targetBtn.childNodes[0], 'mouseout', buttonEventsHandler);
						Z.sliderFocus = (Z.mouseWheel == 2) ? 'imageSet' : 'zoom';
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

		// Use vp ID 0 if one panel, or actual ID if many panels.
		var vp0MIDStr = (Z.annotationFileShared) ? '0' : tbViewportIDStr;
		var isAltKey = event.altKey;

		if (eventType == 'click') {
			if (Z.comparison && tbID.indexOf('Sync') != -1) {
				var eventTarget = Z.Utils.target(event);
				Z.syncComparison = eventTarget.checked;
				Z.Viewer.syncComparisonViewport(true); // checkboxSyncComparison
			}
			// DEV NOTE: Review need for checkboxRollover and checkboxCaptionRollover dedicated handlers.

		} else if (eventType == 'mousedown' || eventType == 'touchstart') {

			// Remove editing cursor from any current text region and position current edit mode indicator.
			textElementRemoveFocus();
			self.positionButtonBorder(tbID);

			// DEV NOTE: Workaround for conflict between viewport ID and counter row ID suffixes.
			if (Z.tracking && tbID.indexOf('buttonCounterListShow') != -1) {
				tbID = 'buttonCounterListShow';
			}

			switch (tbID) {
				case 'buttonMinimize' :
					if (isAltKey) {
						tbViewport.setHotspotsVisibility(!tbViewport.getHotspotsVisibility());
					} else {
						self.minimize(true);
						if (Z.Navigator) {
							Z.Navigator.setVisibility(false);
						}
						if (Z.viewportCurrent) { Z.viewportCurrent.showLists(false); }
					}
					break;
				case 'buttonExpand' :
					if (isAltKey) {
						tbViewport.setHotspotsVisibility(!tbViewport.getHotspotsVisibility());
					} else {
						self.minimize(false);
						if (Z.Navigator) {
							Z.Navigator.setVisibility(true);
						}
						if (Z.viewportCurrent && !(Z.narrative && !Z.narrativeMode)) { Z.viewportCurrent.showLists(true); }
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

				case 'buttonHelp' :
					// Help is provided in five ways: viewer help for toolbar button, viewer help + annotation viewing help for toolbar button in annotation viewing mode,
					// markup editing help for markup button in markup editing mode, and annotation editing help for annotation panel button in annotation editing mode.
					// In addition, the zHelpPath parameter enables a fifth alternative, a custom help window.
					// This fifth option is managed within the showHelp function.
					if (Z.annotations && Z.editMode === null) {
						// Viewer help + annotation viewing help for toolbar button in annotation viewing mode.
						Z.Utils.showHelp(Z.Utils.getResource('CONTENT_HELPTOOLBAR') + Z.Utils.getResource('CONTENT_HELPCONCATENATOR') + Z.Utils.getResource('CONTENT_HELPANNOTATIONVIEWING'));
					} else {
						// Viewer help for toolbar button.
						Z.Utils.showHelp(Z.Utils.getResource('CONTENT_HELPTOOLBAR'));
					}
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
				if (!Z.tracking) {
					tbViewport.pan('horizontalStop');
				} else {
					if (tbID == 'buttonPanLeft') {
						Z.viewportCurrent.goToNextCell('left');
					} else {
						Z.viewportCurrent.goToNextCell('right');
					}
				}
				// Optional means to toggle smooth pan off and on.
				if (tbID == 'buttonPanLeft' && isAltKey) { tbViewport.toggleSmoothPan(); }
			} else if (tbID == 'buttonPanUp' || tbID == 'buttonPanDown') {
				if (!Z.tracking) {
					tbViewport.pan('verticalStop');
				} else {
					if (tbID == 'buttonPanUp' ) {
						Z.viewportCurrent.goToNextCell('up');
					} else {
						Z.viewportCurrent.goToNextCell('down');
					}
				}
			} else if (tbID == 'buttonHelp') {				
				if (Z.debug == 0 && isAltKey) { Z.Utils.showGlobals(); } // Optional means to display Viewer global variable values when debug parameter is not set in web page.
			} else if (tbID == 'buttonRotateClockwise' || tbID == 'buttonRotateCounterwise') {
				if (Z.rotationFree) { tbViewport.rotate('stop'); }
			} else if (tbID == 'buttonFullView') {
				tbViewport.toggleFullViewMode(true); // Function called on mouseup to avoid conflict with fullscreen mode change processing.
			} else if (tbID == 'buttonFullViewExit') {				
				tbViewport.toggleFullViewMode(false); // Function called on mouseup to avoid conflict with fullscreen mode change processing.

			} else if (tbID == 'buttonRulerSettingsShow') {
				Z.Ruler.showRulerSettings(true);  // Function called on mouseup to avoid leaving Z.buttonIsDown equal to true when show and cancel or save buttons swapped.
			} else if (tbID == 'buttonRulerSettingsCancel') {
				Z.Ruler.showRulerSettings(false);  // Function called on mouseup to avoid leaving Z.buttonIsDown equal to true when show and cancel or save buttons swapped.
			} else if (tbID == 'buttonRulerSettingsSave') {
				Z.Ruler.showRulerSettings(false, true);  // Function called on mouseup to avoid leaving Z.buttonIsDown equal to true when show and cancel or save buttons swapped.

			} else if (tbID == 'buttonNarrativePreview') {
				Z.Narrative.toggleNarrativeMode(false); // Function called on mouseup to avoid leaving Z.buttonIsDown equal to true when view and edit buttons swapped.
			} else if (tbID == 'buttonNarrativeEdit') {
				Z.Narrative.toggleNarrativeMode(true); // Function called on mouseup to avoid leaving Z.buttonIsDown equal to true when view and edit buttons swapped.

			} else if (tbID == 'buttonNarrativeToolsShow') {
				Z.Narrative.showFileManagerPanel(false); // Function called on mouseup to avoid leaving Z.buttonIsDown equal to true when show and hide buttons swapped.
			} else if (tbID == 'buttonFileManagerShow') {
				Z.Narrative.showFileManagerPanel(true); // Function called on mouseup to avoid leaving Z.buttonIsDown equal to true when show and hide buttons  swapped.

			} else if (tbID == 'trackSliderImageSet') {
				if (Z.slidestack) { sliderSnapImageSet(event); }
			} else if (tbID == 'buttonImageSetPrior' || tbID == 'buttonImageSetNext') {
				if (Z.animation) {
					Z.Viewer.viewportChange('stop');
				} else if (Z.slidestack) {
					if (tbID == 'buttonImageSetPrior') {
						Z.Viewer.viewportChange('backward');
					} else if (tbID == 'buttonImageSetNext') {
						Z.Viewer.viewportChange('forward');
					}
				}
				
			} else if (tbID == 'buttonImageFilterClear') {
				tbViewport.clearImageFilterLast();
			} else if (tbID == 'buttonImageFiltersClearAll') {
				tbViewport.clearImageFiltersAll();
			} else if (tbID == 'buttonImageFilterPanelShow') {
				self.showImageFilterPanel(true);
			} else if (tbID == 'buttonImageFilterPanelHide') {
				self.showImageFilterPanel(false);
			} else if (tbID == 'buttonImageFilterPanelHideOnPanel') {
				self.showImageFilterPanel(false);
			}

		} else if (eventType == 'mouseout') {
			if (tbID == 'buttonZoomOut' || tbID == 'buttonZoomIn') {
				tbViewport.zoom('stop');
			} else if (tbID == 'buttonPanLeft' || tbID == 'buttonPanRight') {
				tbViewport.pan('horizontalStop');
			} else if (tbID == 'buttonPanUp' || tbID == 'buttonPanDown') {
				tbViewport.pan('verticalStop');
			} else if (tbID == 'buttonRotateClockwise' || tbID == 'buttonRotateCounterwise') {
				if (Z.rotationFree) { tbViewport.rotate('stop'); }
			} else if (tbID == 'buttonImageSetPrior' || tbID == 'buttonImageSetNext') {
				Z.Viewer.viewportChange('stop');
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
						Z.Utils.setButtonDefaults(relatedTarget.parentNode);
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
		var toolbarChildren = Z.ToolbarDisplay.childNodes;
		for (var i = 0, j = toolbarChildren.length; i < j; i++) {
			var target = toolbarChildren[i];
			var tID = target.id;
			if (tID && tID.indexOf('button') != -1) {
				if (tID != 'buttonContainer' && tID != 'buttonContainerImageFilter') {
					Z.Utils.setButtonDefaults(target);
				} else {
					var targetChildren = target.childNodes;
					for (var k = 0, m = targetChildren.length; k < m; k++) {
						var targetSub = targetChildren[k];
						var tIDS = targetSub.id;
						if (tIDS && tIDS.indexOf('button') != -1) {
							Z.Utils.setButtonDefaults(targetSub);
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
		if (targetBtn.id.indexOf('button') != -1 && targetBtn.id.indexOf('buttonContainer') == -1) {
			var iU = targetBtn.firstChild;
			var iO = targetBtn.childNodes[1];
			var iD = targetBtn.childNodes[2];
			if (iU && iO && iD) {
				var iuS = iU.style;
				var ioS = iO.style;
				var idS = iD.style;
				iuS.visibility = ioS.visibility = idS.visibility = 'hidden';
				// First line assigns priority to slider button mousedown state over mouse out/over/up events of other buttons.
				if (eT == 'mouseover' && targetBtn.id == 'buttonSliderZoom' && buttonSliderZoomDown) {
					idS.visibility = 'visible';
				} else if (eT == 'mouseover' && targetBtn.id.indexOf('buttonSliderFilter') != -1 && buttonSliderFilterDown) {
					idS.visibility = 'visible';
				} else if (eT == 'mouseover' && targetBtn.id == 'buttonSliderImageSet' && buttonSliderImageSetDown) {
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
			var currentTextRegion = document.getElementById(elmt);
			currentTextRegion.blur();
		}
	}

	this.positionButtonBorder = function (tbID) {
		// Use vp ID 0 if one panel, or actual ID if many panels.
		var vp0MIDStr = (Z.annotationFileShared) ? '0' : tbViewportIDStr;

		// Position button border large around buttonViewMode, buttonEditModeFieldOfView, buttonEditModeShape, buttonEditModeFreehand, buttonModePolygon, buttonModeMeasure, or position button border small around clicked color button.
		if (tbID.substr(0, 11) == 'buttonColor') {
			var btnBrdr = document.getElementById('buttonBorderSm' + vp0MIDStr);
		} else {
			if (tbID == 'buttonViewMode' + vp0MIDStr || tbID == 'buttonEditModeFieldOfView' + vp0MIDStr || tbID == 'buttonEditModeText' + vp0MIDStr ||  tbID == 'buttonEditModeShape' + vp0MIDStr || tbID == 'buttonEditModeFreehand' + vp0MIDStr || tbID == 'buttonEditModePolygon' + vp0MIDStr || tbID == 'buttonEditModeMeasure' + vp0MIDStr) {
				var btnBrdr = document.getElementById('buttonBorderLg' + vp0MIDStr);
			}
		}
		var tgtBtn = document.getElementById(tbID);
		if (btnBrdr && tgtBtn) {
			if (tbID == 'buttonClearAll' + vp0MIDStr) { tgtBtn = document.getElementById('buttonViewMode' + tbViewportID); }
			var btnBrdrS = btnBrdr.style;
			var tgtBtnS = tgtBtn.style;
			btnBrdrS.left = parseFloat(tgtBtnS.left) - 2 + 'px';
			btnBrdrS.top = parseFloat(tgtBtnS.top) - 2 + 'px';
		}
	}

	// Show or hide panel and Hide and Show buttons.
	this.showImageFilterPanel = function (visible) {
		var bGF = document.getElementById('imageFilterPanelBackground');
		var bCF = document.getElementById('buttonContainerImageFilter');
		var bFPS = document.getElementById('buttonImageFilterPanelShow');
		var bFPH = document.getElementById('buttonImageFilterPanelHide');
		if (bGF && bCF && bFPS && bFPH) {
			bGF.style.width = (visible) ? imageFilterPanelW + 'px' : '0px';
			bCF.style.display = (visible) ? 'inline-block' : 'none';
			bFPS.style.display = (visible) ? 'none' :  'inline-block';
			bFPH.style.display = (visible) ? 'inline-block' : 'none';
		}
		imageFilterPanelVisible = visible;
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
		var cliF = document.getElementById('imageFilterList');
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
		var cliF = document.getElementById('imageFilterList');
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
		var cliF = document.getElementById('imageFilterList');
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

Z.ZoomifyNavigator = function (navViewport) {
			
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::: INIT FUNCTIONS ::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	// Declare variables for navigator internal self-reference and initialization completion.
	var self = this;
	var isInitialized = false;
	var navViewportIDStr = navViewport.getViewportID().toString();
	var validateNavigatorGlobalsInterval;

	// Declare variables for navigator display.
	var navigatorDisplay;
	var nD, ndS, nB, nbS, niC, nicS, nI, nR, nrS;
	var navigatorImage;
	var navigatorImageAltText = Z.Utils.getResource('UI_NAVIGATORACCESSIBILITYALTATTRIBUTE');
	var MOUSECLICK_THRESHOLD_NAVIGATOR = parseInt(Z.Utils.getResource('DEFAULT_MOUSECLICKTHRESHOLDNAVIGATOR'), 10);
	var TOUCHTAP_THRESHOLD_NAVIGATOR = parseInt(Z.Utils.getResource('DEFAULT_TOUCHTAPTHRESHOLDNAVIGATOR'), 10);

	// Declare and set variables local to navigator for size and position.
	var navW = Z.navigatorW;
	var navH = Z.navigatorH;
	var navL = Z.navigatorL;
	var navT = Z.navigatorT;
	var navFit = Z.navigatorFit;
	var navImageW, navImageH = null;

	if (Z.comparison && navViewportIDStr == '1') { navL = Z.viewerW - navW - 1; }

	// Create navigator.
	initializeNavigator();

	// Navigator thumbnail will be loaded in Viewer and cached for retrieval by Navigator on initialization or callback validation by Viewer.
	function initializeNavigator () {

		// Create navigator display to contain background, image, and rectangle.
		navigatorDisplay = Z.Utils.createContainerElement('div', 'navigatorDisplay' + navViewportIDStr, 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', navL + 'px', navT + 'px', 'solid', '1px', 'transparent', '0px', '0px', 'normal', null, true);
		Z.NavigatorDisplay = navigatorDisplay; // Global reference for rapid opacity setting from Viewer - not necessary for second Navigator as no dual-navigator slideshows.
		nD = navigatorDisplay;
		ndS = nD.style;
		if (Z.slideshow) { Z.Utils.setOpacity(Z.NavigatorDisplay, 0); }

		// Ensure proper z-ordering of Viewer elements.
		ndS.zIndex = (Z.baseZIndex + 4).toString();

		// Create background and set transparency.
		var backAlpha = parseFloat(Z.Utils.getResource('DEFAULT_BACKGROUNDALPHA'));
		var backColor = Z.Utils.getResource('DEFAULT_BACKGROUNDCOLOR');
		var backColorNoAlpha = Z.Utils.getResource('DEFAULT_BACKGROUNDCOLORNOALPHA');
		var navigatorBackground = Z.Utils.createContainerElement('div', 'navigatorBackground', 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', '0px', '0px', 'none', '0px', backColor, '0px', '0px', 'normal', null, true);
		Z.Utils.setOpacity(navigatorBackground, backAlpha, backColorNoAlpha);
		navigatorDisplay.appendChild(navigatorBackground);
		nB = navigatorBackground;
		nbS = nB.style;

		// Add thumbnail image container.
		var navigatorImageContainer = Z.Utils.createContainerElement('div', 'navigatorImageContainer', 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal', null, true);
		navigatorDisplay.appendChild(navigatorImageContainer);
		niC = navigatorImageContainer;
		nicS = niC.style;

		// Create rectangle to indicate position within image of current viewport view.
		var navigatorRectangle = Z.Utils.createContainerElement('div', 'navigatorRectangle', 'inline-block', 'absolute', 'hidden', navW+1 + 'px', navH+1 + 'px', navL + 'px', navT + 'px', 'solid', '1px', 'transparent', '0px', '0px', 'normal', null, true);
		navigatorRectangle.style.borderColor = Z.Utils.stringValidateColorValue(Z.navigatorRectangleColor);
		navigatorDisplay.appendChild(navigatorRectangle);
		nR = navigatorRectangle;
		nrS = nR.style;

		if (Z.comparison) {
			// Create outline to indicate current viewport.
			var navigatorBorderColor = Z.Utils.getResource('DEFAULT_NAVIGATORBORDERCOLOR');
			var navigatorBorder = Z.Utils.createContainerElement('div', 'navigatorBorder' + navViewportIDStr, 'inline-block', 'absolute', 'hidden', navW+1 + 'px', navH+1 + 'px', navL + 'px', navT + 'px', 'solid', '1px', 'transparent', '0px', '0px', 'normal', null, true);
			navigatorBorder.style.borderColor = Z.Utils.stringValidateColorValue(navigatorBorderColor);
			navigatorDisplay.appendChild(navigatorBorder);
			nBO = navigatorBorder;
			nboS = nB.style;
		}

		// Add navigator to viewer display and set size, position, visibility, and zIndex.
		Z.ViewerDisplay.appendChild(navigatorDisplay);
		setSizeAndPosition(navW, navH, navL, navT, navFit, null, null);
		visibility(Z.navigatorVisible == 1 || Z.navigatorVisible == 2);

		// Enable mouse, initialize navigator, sync to viewport.
		// Prevent object dragging and bubbling.
		Z.Utils.addEventListener(nD, 'mouseover', Z.Utils.stopPropagation);
		Z.Utils.addEventListener(nD, 'mousedown', navigatorMouseDownHandler);
		Z.Utils.addEventListener(nD, 'touchstart', navigatorTouchStartHandler);
		Z.Utils.addEventListener(nD, 'touchmove', navigatorTouchMoveHandler);
		Z.Utils.addEventListener(nD, 'touchend', navigatorTouchEndHandler);
		Z.Utils.addEventListener(nD, 'touchcancel', navigatorTouchCancelHandler);

		if (navViewport && (navViewport.getStatus('precacheLoadedViewport') || Z.tileSource == 'unconverted')) {
			configureNavigator();
		} else {
			var targetNavCallback = (!Z.comparison || navViewportIDStr == '0') ? 'navigatorTileLoaded' : 'navigator2TileLoaded';
			Z.setCallback(targetNavCallback, configureNavigator);
		}
	}
	
	function configureNavigator () {
		if (typeof navigatorImage === 'undefined') {
			var targetNavCallback = (!Z.comparison || navViewportIDStr == '0') ? 'navigatorTileLoaded' : 'navigator2TileLoaded';
			Z.clearCallback(targetNavCallback, configureNavigator);
			drawNavigatorImage();
			setInitialized(true);
			syncToViewport(); // Method also called in setSizeAndPosition | drawLayout above but that is prior to full initialization of navigator.
		}
	}

	this.drawNavigatorImage = function (image) {
		drawNavigatorImage(image);
	}

	this.drawNavigatorImage = function (image) {
		drawNavigatorImage(image);
	}
	
	function drawNavigatorImage (image) {
		// Load Zoomify Image thumbnail.
		if (Z.tileSource != 'unconverted') {
			navigatorImage = (typeof image !== 'undefined' && image !== null) ? image : navViewport.getNavigatorImage();
		} else if (Z.useCanvas) {	
			navigatorImage = navViewport.createUnconvertedImageThumbnail(image);
		}

		if (niC && navigatorImage) {			
			// Verify image load completion.
			var testImageContainer = Z.Utils.createContainerElement('div', 'testImageContainer', 'inline-block', 'absolute', 'hidden', navW + 'px', navH + 'px', '0px', '0px', 'none', '0px', 'transparent', '0px', '0px', 'normal', null, true);
			testImageContainer.appendChild(navigatorImage);
			testImageContainer.removeChild(navigatorImage);
			testImageContainer = null;
			var tW = navigatorImage.width;
			var tH = navigatorImage.height;

			if (tW != 0 && tH != 0) {
				niC.innerHTML = '';
				niC.appendChild(navigatorImage);
				navigatorImage.alt = navigatorImageAltText;
				navigatorImage.id = 'navigatorImage';
				nI = navigatorImage;
				var niW = nI.width;
				var niH = nI.height;

				setSizeAndPosition(navW, navH, navL, navT, navFit, tW, tH);

				// DEV NOTE: alternative implementation addressed IE issue. Monitor need.
				//setSizeAndPosition(navW, navH, navL, navT, navFit, niW, niH);

			} else {
				var navigatorImageLoadedTimer = window.setTimeout(self.drawNavigatorImage, 100);
			}
			
		} else {
			var navigatorImageLoadedTimer = window.setTimeout(self.drawNavigatorImage, 100);
		}
	}

	this.setImage = function () {
		if (Z.tracking && navigatorDisplay && navigatorDisplay.childNodes.length > 0) { navigatorDisplay.removeChild(navigatorTrackingOverlay);}
		drawNavigatorImage();
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
			Z.Utils.validateCallback('navigatorInitialized');
			Z.Viewer.validateViewerReady('navigatorInitialized');
		}
	}

	this.setVisibility = function (visible) {
		visibility(visible);
	}

	this.setSelected = function (selected) {
		if (!nBO) { var nBO = document.getElementById('navigatorBorder' + navViewportIDStr); }
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
		if (!Z.overlays ) { self.setImage(); }
	}

	this.drawNavigatorTrackingOverlay = function (trackingCells, navImgArr) {
		var navTrackOverlay = document.getElementById('navigatorTrackingOverlay');
		if (typeof navTrackOverlay === 'undefined' || navTrackOverlay === null) {
			var navTrackOverlay = Z.Utils.createContainerElement('div', 'navigatorTrackingOverlay', 'none', 'absolute', 'visible', navW+1 + 'px', navH+1 + 'px', navL + 'px', navT + 'px', 'none', '0px', 'transparent', '0px', '0px', 'normal', null, true);
			navigatorDisplay.appendChild(navTrackOverlay);
		}
		if (navTrackOverlay) {
			while (navTrackOverlay.hasChildNodes()) { navTrackOverlay.removeChild(navTrackOverlay.lastChild); }
			if (typeof navImgArr === 'undefined' || navImgArr === null) { navImgArr = Z.Navigator.getSizeAndPositionNavigatorImage(); }
			if (navImgArr) {
				var overlayCellWPercent = navImgArr.width / Z.imageW;
				var overlayCellHPercent = navImgArr.height / Z.imageH;
				var overlayCellW = Math.round(Z.viewerW * overlayCellWPercent);
				var overlayCellH = Math.round(Z.viewerH * overlayCellHPercent);

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
							navTrackOverlay[cellComp] = Z.Utils.createContainerElement('div', cellComp, 'inline-block', 'absolute', 'visible', cellW + 'px', cellH + 'px', overlayCellL + 'px', overlayCellT + 'px', 'solid', '1px', trackingOverlayCellColor, '0px', '0px', 'normal', null, true);
							navTrackOverlay.appendChild(navTrackOverlay[cellComp]);
							Z.Utils.setOpacity(navTrackOverlay[cellComp], 0.25);
						}
					}
				}
			} else {
				var drawTrackingTimer = window.setTimeout( function () { self.drawNavigatorTrackingOverlay(trackingCells); }, 10);
			}
		}
	}

	getTrackingOverlayColor = function (zoom) {
		var mag = Z.Utils.convertZoomPercentToMagnification(zoom * 100, Z.sourceMagnification, true);
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
				nbS = nB.style;
				niC = navigatorDisplay.childNodes[1]; // Image container.
				nicS = niC.style;
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
		if (typeof width === 'undefined' || width === null) { width = Z.navigatorW; }
		if (typeof height === 'undefined' || height === null) { height = Z.navigatorH; }
		if (typeof left === 'undefined' || left === null) { left = 0; }
		if (typeof top === 'undefined' || top === null) { top = 0; }

		if (!nD) { nD = navigatorDisplay; }
		if (!ndS) { ndS = nD.style; }

		// Set navigator image var explicitly in case image is being reset using setImage function to ensure thumbnail size is reset.
		if (typeof niW !== 'undefined' && niW != null && typeof niH !== 'undefined' && niH != null) { nI = nD.childNodes[1].firstChild; }

		// DEV NOTE: Next two lines are workaround for IE11 issue getting correct navigator image dimensions.
		// See comment on this line in calling function initializeNavigator: Z.ViewerDisplay.appendChild(navigatorDisplay);
		if (nI) {
			if (nI.width == 0 && niW !== 'undefined' && niW !== null) { nI.width = niW; }
			if (nI.height == 0 && niH !== 'undefined' && niH !== null) { nI.height = niH; }
		}

		if (nD && ndS && nI) {
			// Override defaults and parameters and match Navigator aspect ratio to Viewer.
			if (Z.tracking) { fit = 0; }

			// If fitting navigator to aspect ratio of image or viewer calculate and apply aspect ratio to reset navigator
			// dimensions while constraining it within width and height parameters as bounding maximum values.
			if (typeof fit !== 'undefined' && fit !== null) {
				var navAspect = nI.width / nI.height;
				var viewerAspect = Z.viewerW / Z.viewerH;
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

			// Adjust horizontal position for Narrative pane if present.
			if (Z.narrative) {
				var margin = 15;
				left += Z.narrativeW + margin;
				top += margin;
			}

			// Set navigator position.
			ndS.left = left + 'px';
			ndS.top = top + 'px';

			drawLayout(width, height);
		}

		// Update global values and reposition dependent components.
		Z.navigatorW = width;
		Z.navigatorH = height;
		if (Z.tracking || Z.annotations || Z.narrative) {					
			if (Z.Ruler && Z.Ruler.getInitialized()) {
				var left = (Z.rulerL == -1 && Z.Navigator) ? Z.navigatorL : Z.rulerL;
				var top = (Z.rulerT == -1 && Z.Navigator) ? (Z.navigatorT + Z.navigatorH + 1) : Z.rulerT;
				Z.Ruler.setSizeAndPosition(Z.rulerW, Z.rulerH, left, top);
			}
			if (Z.userPanelVisible && Z.UserPanel !== null) {
				var panelW = Z.rulerW;
				var panelH = parseInt(Z.Utils.getResource('DEFAULT_USERPANELHEIGHT'), 10);
				var panelCoords = Z.Utils.calculateUserPanelCoords(Z.userPanelPosition, panelW, panelH, Z.viewerW, Z.viewerH);
				var left = (Z.rulerL == -1 && Z.Navigator) ? Z.navigatorL : Z.rulerL;
				var top = (Z.rulerT == -1 && Z.Navigator) ? (Z.navigatorT + Z.navigatorH + 1) : Z.rulerT;
				Z.Utils.sizeAndPositionUserPanel(Z.UserPanel.style, panelW, panelH, panelCoords.x, panelCoords.y);
			}
			if (Z.imageList && navViewport.getStatus('initializedImageList')) {
				navViewport.setSizeAndPositionImageList();
				if (Z.comparison) {
					var vpComparison = (navViewport.getViewportID() == 0) ? Z.Viewport1 : Z.Viewport0;
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
				if (Z.comparison) {
					if (!nBO) { var nBO = document.getElementById('navigatorBorder' + navViewportIDStr); }
					if (nBO) {
						var nboS = nBO.style;
						nboS.width = (width - 2) + 'px';
						nboS.height = (height - 2) + 'px';
						nboS.left = parseFloat(nbS.left) + 'px';
						nboS.top = parseFloat(nbS.top) + 'px';
						nboS.display = (navViewportIDStr == Z.viewportCurrentID) ? 'inline-block' : 'none';
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
			var scaleW = nI.width / Z.imageW;
			var scaleH = nI.height / Z.imageH;

			var recalculate = (Z.comparison && navViewportIDStr != Z.viewportCurrentID);
			var currentZ = navViewport.getZoom(recalculate);

			var vpScaledW = Z.viewerW * scaleW / currentZ;
			if (Z.comparison) { vpScaledW /= 2; }
			var vpScaledH = Z.viewerH * scaleH / currentZ;

			nrS.width = vpScaledW + 'px';
			nrS.height = vpScaledH + 'px';
		}
	}

	function syncNavigatorRotation () {
		if (!nicS && navigatorDisplay) { nicS = navigatorDisplay.childNodes[1].style; } // Image container.
		if (nicS) {
			var currentR = navViewport.getRotation();
			Z.Utils.rotateElement(nicS, currentR, true);
		}
	}

	// Convert image pixel coordinates at viewport display center to navigator
	// pixel coordinates to position top left of navigator rectangle.
	function syncNavigatorRectangleToViewport (vpImgCtrPt) {
		if (nI && nrS && nicS) {
			if (typeof vpImgCtrPt === 'undefined' || vpImgCtrPt === null || (vpImgCtrPt.x == 0 && vpImgCtrPt.y == 0)) {
				var vpImgCtrPt = new Z.Utils.Point(Z.imageX, Z.imageY);
			}
			if (typeof z === 'undefined' || z === null) { z = Z.imageZ; }
			var r = Z.imageR;
			if (r < 0) { r += 360; } // Ensure positive values.

			// Convert coordinates from image pixels to thumbnail pixels.
			var tW = parseFloat(nI.width);
			var tH = parseFloat(nI.height);
			var scaleW = tW / Z.imageW;
			var scaleH = tH / Z.imageH;
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

			var compAdj = (Z.comparison) ? -1 : 0;
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
			var z = Z.imageZ;
			var r = Z.imageR;
			if (r < 0) { r += 360; } // Ensure positive values.

			// Get new coordinates from navigator rectangle.
			var rnL = parseFloat(nrS.left);
			var rnT = parseFloat(nrS.top);
				
			// Adjust new rectangle position for rectangle and navigator offsets.
			var ncX = parseFloat(ndS.width) / 2;
			var ncY = parseFloat(ndS.height) / 2;
			var rL = rnL - ncX;
			var rT = rnT - ncY;
			var rcX = rL + parseFloat(nrS.width) / 2;
			var rcY = rT + parseFloat(nrS.height) / 2;

			// Translate coordinates to center axis perspective and rotate.
			var tcPt = Z.Utils.rotatePoint(rcX, rcY, r);
			var tW = parseFloat(nI.width);
			var tH = parseFloat(nI.height);
			var tX = tcPt.x + tW / 2;
			var tY = tcPt.y + tH / 2;

			// Convert coordinates from thumbnail pixels to image pixels.
			var scaleW = tW / Z.imageW;
			var scaleH = tH / Z.imageH;
			var newVPImgCtrX = tX / scaleW;
			var newVPImgCtrY = tY / scaleW;

			// Apply new image pixel coordinates to viewport display.
			var newVPImgCtrPt = new Z.Utils.Point(newVPImgCtrX, newVPImgCtrY);
			
			navViewport.syncViewportToNavigator(newVPImgCtrPt);
		}
	}
		
	function navigatorImageLoadingFailed () {
		Z.Utils.showMessage(Z.Utils.getResource('ERROR_NAVIGATORIMAGEPATHINVALID'));
	}

	

	//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::::: EVENT FUNCTIONS :::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	function navigatorMouseDownHandler (event) {
		if (!Z.interactive) { return; }

		navViewport.zoomAndPanAllStop(false, true);
		Z.mouseIsDown = true;
		if (Z.comparison) { Z.Viewer.viewportSelect(parseInt(navViewportIDStr, 10)); }
		if (Z.maskingSelection && Z.maskClearOnUserAction) { navViewport.clearMask(); }

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
		if (!Z.interactive) { return; }
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
		if (!Z.interactive) { return; }

		Z.mouseIsDown = false;

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
			if (!Z.comparison || !click) { 
				navViewport.updateView();
			}
		}
	}

	function navigatorTouchStartHandler (event) {
		if (!Z.interactive) { return; }
		Z.mouseIsDown = true;

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
		if (!Z.interactive) { return; }
		event.preventDefault(); // Prevent page dragging.
		if (!Z.mousePan) { return; }  // Disallow mouse panning if parameter false.

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
		if (!Z.interactive) { return; }
		Z.mouseIsDown = false;

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
		if (!Z.interactive) { return; }
		Z.mouseIsDown = false;

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



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::: NETCONNECTOR FUNCTIONS ::::::::::::::::::::::::::::::::
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

Z.NetConnector = function () {
	var imagesLoading = 0;
	var IMAGES_LOADING_MAX = parseInt(Z.Utils.getResource('DEFAULT_IMAGESLOADINGMAX'), 10);
	var IMAGE_LOAD_TIMEOUT = parseFloat(Z.Utils.getResource('DEFAULT_IMAGELOADTIMEOUT'));
	var loadImageQueueDelay = Z.Utils.getResource('DEFAULT_IMAGELOADQUEUEDELAY');
	var loadImageQueueInterval;
	var loadImageQueue = [];

	this.loadHTML = function (htmlPath, recResp, data, contentType) {
		makeNetRequest(htmlPath, recResp, null, contentType);
	}

	this.loadHTMLToRenameIn = function (htmlPath, recResp, data, contentType, oldName, newName) {				
		makeNetRequest(htmlPath, recResp, null, contentType, null, null, null, htmlPath, oldName, newName);
	}

	this.loadXML = function (xmlPath, vpID, contentType) {
		if (typeof vpID === 'undefined' || vpID === null) {
			makeNetRequest(xmlPath, receiveResponse, null, contentType);
		} else {
			makeNetRequest(xmlPath, function(xhr) { receiveResponse(xhr, vpID); }, null, contentType);
		}
	}

	this.loadFileList = function (handlerPath, contentType, filePath, fileTypes) {
		// Pass file path and types in query string and content type as function parameter.
		if (!Z.localUse && typeof contentType !== 'undefined' && Z.Utils.stringValidate(contentType)) {
			var accessParam = 'accessType=list';
			var pathParam = (typeof filePath !== 'undefined' && Z.Utils.stringValidate(filePath)) ? ('filePath=' + filePath) : '';
			var typeParam = (typeof fileTypes !== 'undefined' && Z.Utils.stringValidate(fileTypes)) ? ('fileTypes=' + fileTypes) : '';
			var queryStr = (pathParam != '' || typeParam != '') ? '?' : '';
			var concatStr = (pathParam != '' && typeParam != '') ? '&' : '';
			handlerPath = handlerPath + queryStr + accessParam + concatStr + 'filePath=' + filePath + concatStr + 'fileTypes=' + fileTypes;
			makeNetRequest(handlerPath, receiveResponse, null, contentType);
		}
	}

	this.renameFile = function (handlerPath, contentType, oldName, newName) {
		// Pass file path and types in query string and content type as function parameter.
		if (typeof oldName !== 'undefined' && Z.Utils.stringValidate(oldName) && typeof newName !== 'undefined' && Z.Utils.stringValidate(newName)) {
			var accessParam = 'accessType=rename';
			var queryStr = '?';
			var concatStr = '&';
			handlerPath = handlerPath + queryStr + accessParam + concatStr + 'filePathOld=' + oldName + concatStr + 'filePathNew=' + newName;
			makeNetRequest(handlerPath, receiveResponse, null, contentType);
		}
	}

	this.deleteFile = function (handlerPath, contentType, filePath) {
		var accessParam = 'accessType=delete';
		var queryStr = '?';
		var concatStr = '&';
		var pathParam = (typeof filePath !== 'undefined' && Z.Utils.stringValidate(filePath)) ? ('filePath=' + filePath) : '';
		handlerPath = handlerPath + queryStr + accessParam + concatStr + pathParam;
		makeNetRequest(handlerPath, receiveResponse, null, contentType);
	}

	this.loadJSON = function (jsonPath, vpID, contentType) {
		if (typeof vpID === 'undefined' || vpID === null) {
			makeNetRequest(jsonPath, receiveResponse, null, contentType);
		} else {
			makeNetRequest(jsonPath, function(xhr) { receiveResponse(xhr, vpID); }, null, contentType);
		}
	}

	this.loadByteRange = function (filePath, rangeStart, rangeEnd, contentType, dataType, tile, chunkID, vpID) {
		var rangeData = new Z.Utils.Range(rangeStart, rangeEnd);
		if (Z.useLocalFile) {
			// Parameter vpID passed instead of callback because function sets validateBytes as onloadend function.
			makeLocalRequest(filePath, vpID, rangeData, contentType, dataType, tile, chunkID);
		} else {
			makeNetRequest(filePath, function(xhr) { receiveResponse(xhr, vpID); }, rangeData, contentType, dataType, tile, chunkID);
		}
	}

	function loadImageByteRange (filePath, contentType, dataType, tile, vpID) {
		var tileName = (tile !== null) ? tile.name : 'null-nav?';
		var imagePath = filePath.substring(0, filePath.indexOf('?'));
		var rangeStart = parseFloat(filePath.substring(filePath.indexOf('?') + 1, filePath.indexOf(',')));
		var rangeLength = parseFloat(filePath.substring(filePath.indexOf(',') + 1, filePath.length));
		var rangeEnd = rangeStart + rangeLength;
		var rangeData = new Z.Utils.Range(rangeStart, rangeEnd);
		if (Z.useLocalFile) {
			// Parameter vpID passed instead of callback because function sets validateBytes as onloadend function.
			makeLocalRequest(filePath, vpID, rangeData, contentType, dataType, tile, null);
		} else {
			makeNetRequest(imagePath, function(xhr) { receiveResponse(xhr, vpID); }, rangeData, contentType, dataType, tile);
		}
	}

	// If not using legacy save handler add file handler query string flags.
	this.postXML = function (handlerPath, xmlData, postType, filePath) {
		if (typeof filePath !== 'undefined' && Z.Utils.stringValidate(filePath)) {
			var contentType = postType;
			var accessParam = (!Z.legacySaveHandlerInUse) ? 'accessType=save' : '';
			var queryStr = '?';
			var concatStr = (accessParam != '') ? '&' : '';
			var pathParam = (!Z.legacySaveHandlerInUse) ? 'filePath=' + filePath : 'file=' + filePath;
			var postPath = handlerPath + queryStr + accessParam + concatStr + pathParam;
			makeNetRequest(postPath, receiveResponse, xmlData, contentType);
		}
	}

	this.postHTML = function (handlerPath, xmlData, filePath) {
		if (typeof filePath !== 'undefined' && Z.Utils.stringValidate(filePath)) {
			var contentType = 'postingHTML';
			var accessParam = 'accessType=save';
			var queryStr = '?';
			var concatStr = '&';
			var pathParam = 'filePath=' + filePath;
			var postPath = handlerPath + queryStr + accessParam + concatStr + pathParam;
			makeNetRequest(postPath, receiveResponse, xmlData, contentType);
		}
	}

	this.postImage = function (handlerPath, imageData) {
		var contentType = 'postingImage';
		makeNetRequest(handlerPath, receiveResponse, imageData, contentType);
	}

	this.postFile = function (handlerPath, fileData, filePath, fileType) {
		if (typeof filePath !== 'undefined' && Z.Utils.stringValidate(filePath)) {
			var contentType = 'postingFile-' + fileType;
			var accessParam = 'accessType=save';
			var queryStr = '?';
			var concatStr = '&';
			var pathParam = 'filePath=' + filePath;
			var postPath = handlerPath + queryStr + accessParam + concatStr + pathParam;
			makeNetRequest(postPath, receiveResponse, fileData, contentType);
		}
	}

	function makeLocalRequest (url, vpID, data, contentType, dataType, tile, chunkN) {
		data.end += 1;
		var blob = Z.localFile.slice(data.start, data.end);
		var localFileReader = new FileReader();				
		localFileReader.onloadend = function(event) {
			if (event.target.readyState == FileReader.DONE) {
				validateBytes(event.target.result, vpID, contentType, dataType, tile, chunkN);
			}
		};
		localFileReader.readAsArrayBuffer(blob);
	}

	// URL parameter includes file handler path, access type, and file path (old and new if renaming).
	function makeNetRequest (url, callback, data, contentType, dataType, tile, chunkN, filePath, oldName, newName) {
		var netRequest = createXMLHttpRequest();
		if (netRequest === null) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_XMLHTTPREQUESTUNSUPPORTED'));

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
				if (typeof contentType !== 'undefined') {
					var fileType;

					// For file manager and narrative uses path must be relative to file handler, not calling web page.
					// This includes saving, deleting, and posting, but excludes loading of file lists and image data.
					// Also note that links set in HTML during narrative editing are relative to the calling web page.

					// Ensure paths are relative to file handler except direct loading paths.
					if (url.indexOf('accessType') != -1 && url.indexOf('../../') == -1) {
						if (contentType.indexOf('renamingFile') == -1) {
							var pathDelim = 'filePath=';
							var urlIndex = url.indexOf(pathDelim) + pathDelim.length;
							url = url.substring(0, urlIndex) + '../../' + url.substring(urlIndex);
						} else {
							var pathDelimOld = 'filePathOld=';
							var urlIndexOld = url.indexOf(pathDelimOld) + pathDelimOld.length;
							url = url.substring(0, urlIndexOld) + '../../' + url.substring(urlIndexOld);
							var pathDelimNew = 'filePathNew=';
							var urlIndexNew = url.indexOf(pathDelimNew) + pathDelimNew.length;
							url = url.substring(0, urlIndexNew) + '../../' + url.substring(urlIndexNew);
						}
					}

					// Handle different types of loading and posting.
					if (contentType.indexOf('List') != -1) {
						// Loading serverside file list here.
						netRequest.open('GET', url, isAsync);
						Z.Utils.setObjectProperty(netRequest, 'zType', { value : contentType, writable : false, enumerable : false, configurable : false });
						netRequest.setRequestHeader('Content-Type', 'application/json');
						netRequest.send(null);

					} else if (contentType.indexOf('renamingFile') != -1) {
						// Renaming file: narrative (htm), image (zif), media (jpg, jpeg, png, gif, mp4, mov, ogg, avi, flv, mp3), or annotations (xml).
						netRequest.open('POST', url, isAsync);
						fileType = contentType.substring(contentType.indexOf('renamingFile-') + ('renamingFile-').length, contentType.length);
						Z.Utils.setObjectProperty(netRequest, 'zType', { value : 'renamingFile-' + fileType, writable : false, enumerable : false, configurable : false });
						netRequest.send(null);

					} else if (contentType.indexOf('deletingFile') != -1) {
						// Deleting narrative html file. 
						netRequest.open('POST', url, isAsync);
						fileType = contentType.substring(contentType.indexOf('deletingFile-') + ('deletingFile-').length, contentType.length);
						Z.Utils.setObjectProperty(netRequest, 'zType', { value : 'deletingFile-' + fileType, writable : false, enumerable : false, configurable : false });
						netRequest.send(null);
						
					} else if (contentType == 'loadingIIIFJSON') {
						// Loading IIIF JSON. Handled separately here using tile source rather than xhr.zType as object property
						// because that requires using POST rather than GET and that creates cross-domain CORS conflict. 
						// DEV NOTE: validate above comment regarding requirement.
						netRequest.open('GET', url, isAsync);
						netRequest.send(null);						
						
					} else if (contentType.indexOf('loading') != -1 && typeof data === 'undefined' || data === null) {
						// Loading data here: XML, HTML, or JSON (except for IIIF, handled above).
						netRequest.open('GET', url, isAsync);				
						Z.Utils.setObjectProperty(netRequest, 'zType', { value : contentType, writable : false, enumerable : false, configurable : false });
						if (typeof filePath !== 'undefined' && typeof oldName !== 'undefined' && typeof newName !== 'undefined') {
							Z.Utils.setObjectProperty(netRequest, 'zFilePath', { value : filePath, writable : false, enumerable : false, configurable : false });
							Z.Utils.setObjectProperty(netRequest, 'zOldName', { value : oldName, writable : false, enumerable : false, configurable : false });
							Z.Utils.setObjectProperty(netRequest, 'zNewName', { value : newName, writable : false, enumerable : false, configurable : false });
						}						
						if (contentType && contentType.indexOf('HTML') != -1) { netRequest.setRequestHeader('Content-Type', 'text/html'); }
						netRequest.send(null);

					} else if (Z.localUse && contentType.indexOf('post') != -1) {
						// Prevent local posting attempts.
						Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALSAVING'), false, Z.messageDurationStandard, 'center', true);
						return;

					} else if (contentType == 'postingAnnotationsXML' || contentType == 'postingTrackingXML' || contentType == 'postingImageMetadata') {
						Z.postingXML = true;	
						netRequest.open('POST', url, true);
						Z.Utils.setObjectProperty(netRequest, 'zType', { value : contentType, writable : false, enumerable : false, configurable : false });

						// Alternative implementation - also enabled: supports upload handler that receives variable rather than parsing query string from upload script file path.
						var indexConcat = url.indexOf('&');
						var indexQuery = url.indexOf('?');						
						var filePath = (indexConcat != -1) ? url.substring(indexConcat) : url.substring(indexQuery);
						Z.Utils.setObjectProperty(netRequest, 'zFile', { value : filePath, writable : false, enumerable : false, configurable : false });
						netRequest.setRequestHeader('Content-Type', 'application/xml');
						netRequest.send(data);

					} else if (contentType == 'postingHTML') {
						// Saving narrative. Uploading narrative htm file with progress display handled in next conditional.
						Z.postingHTML = true;
						netRequest.open('POST', url, true);
						Z.Utils.setObjectProperty(netRequest, 'zType', { value : 'postingHTML', writable : false, enumerable : false, configurable : false });
						netRequest.setRequestHeader('Content-Type', 'text/html');
						netRequest.send(data);

					} else if (contentType == 'postingImage') {
						// DEV NOTE: Form submission required for progress event. Also, 'multipart/form-data' stated as required for form upload but appears not so, and prevents use of simpler file_get_contents("php://input"); approach on server-side in php.
						Z.Utils.showMessage(Z.Utils.getResource('ALERT_IMAGESAVEUPLOADING'), false, 'none', 'center');
						Z.postingImage = true;
						var fd = new FormData();
						var qryStr = (!Z.legacySaveHandlerInUse) ? 'fileData' : 'fileToUpload';						
						url = (!Z.legacySaveHandlerInUse) ? url + '?accessType=saveImage' : url;
						fd.append(qryStr, data);
						Z.Utils.addEventListener(netRequest.upload, 'progress', Z.Utils.uploadProgress);
						netRequest.open('POST', url, true);
						Z.Utils.setObjectProperty(netRequest, 'zType', { value : contentType, writable : false, enumerable : false, configurable : false });
						netRequest.setRequestHeader('Content-Type', 'application/upload');
						netRequest.send(fd);

					} else if (contentType == 'postingFile-narrative' || contentType == 'postingFile-image' || contentType == 'postingFile-media' || contentType == 'postingFile-labelset') {
						// Uploading narrative, image, media, or label set file.
						Z.Utils.showMessage(Z.Utils.getResource('ALERT_FILEUPLOADING'), false, 'none', 'center');
						Z.postingFile = true;
						var fd = new FormData();
						fd.append('filePath', data);
						Z.Utils.addEventListener(netRequest.upload, 'progress', Z.Utils.uploadProgress);
						netRequest.open('POST', url, true);
						Z.Utils.setObjectProperty(netRequest, 'zType', { value : contentType, writable : false, enumerable : false, configurable : false });
						netRequest.setRequestHeader('Content-Type', 'application/upload');
						netRequest.send(fd);

					} else if (contentType == 'loadingZIFFileBytes' || contentType == 'loadingPFFFileBytes' || contentType == 'loadingImageTile') {
						// Loading singled-file (ZIF or PFF) storage bytes - headers, chunks, offsets, bytecounts, image tiles. Note that loading images from folder-based 
						// storage or for, hotspot media, hotspot popup, gallery thumbnail is implemented using the function loadImage. Cache proofing applied here on 
						// all byterange requests for header and chunks but not tiles. This approach supports consistency and avoids duplicate applications. These are 
						// non-XML, non-posting, non-PFF requests. Note that byte range start and end values are in imagePath until function loadImageByteRange 
						// parses them and passes them to this function as data parameter, leaving url parameter clean for cache proofing.

						if (dataType != 'tile') { url = Z.Utils.cacheProofPath(url); }
						netRequest.open('GET', url, true);
						netRequest.responseType = 'arraybuffer';

						// Include contentType, tile, and chunk number values to be returned in response.
						Z.Utils.setObjectProperty(netRequest, 'zType', { value : contentType, writable : false, enumerable : false, configurable : false });
						Z.Utils.setObjectProperty(netRequest, 'zDataType', { value : dataType, writable : false, enumerable : false, configurable : false });
						Z.Utils.setObjectProperty(netRequest, 'zTile', { value : tile, writable : false, enumerable : false, configurable : false });
						Z.Utils.setObjectProperty(netRequest, 'zChunkNumber', { value : chunkN, writable : false, enumerable : false, configurable : false });

						// Prevent Safari byte range request response caching.
						if (Z.browser == Z.browsers.SAFARI) { netRequest.setRequestHeader('If-Modified-Since', 'Thu, 01 Dec 1994 16:00:00 GMT'); }

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
		if (Z.localUse == true && (Z.browser == Z.browsers.CHROME  || Z.browser == Z.browsers.OPERA || (Z.browser == Z.browsers.IE && Z.browserVersion == 11) || (Z.browser == Z.browsers.SAFARI && Z.browserVersion >= 7))) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-BROWSER'), false, Z.messageDurationStandard, 'center');
		} else if (Z.localUse == true && Z.tileSource == 'ZoomifyZIFFile') {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-ZIF'), false, Z.messageDurationShort, 'center');
		} else if (Z.localUse == true && Z.tileSource == 'ZoomifyPFFFile') {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_UNSUPPORTEDLOCALVIEWING-FORMAT-PFF'), false, Z.messageDurationShort, 'center');
		} else if (url.toLowerCase().indexOf('.zif') != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ZIFBYTERANGE') + contentType + '.', false, Z.messageDurationShort, 'center');
		} else if (url.indexOf('ImageProperties.xml') != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEXML'), true, null, 'left');
		} else if (url.toLowerCase().indexOf('.pff') != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEHEADER'), false, Z.messageDurationShort, 'center');
		} else if (url.toLowerCase().indexOf('.pff') != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEXML-DZI'), false, Z.messageDurationShort, 'center');
		} else if (url.toLowerCase().indexOf('reply_data') != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEOFFSET'), false, Z.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_SKINXMLFILE')) != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-TOOLBARSKINSXML'), true, null, 'left');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_IMAGELISTXMLFILE')) != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGELISTXML'), false, Z.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_COMPARISONXMLFILE')) != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-COMPARISONXML'), false, Z.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_SLIDESXMLFILE')) != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-SLIDESXML'), false, Z.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_HOTSPOTSXMLFILE')) != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-HOTSPOTSXML'), false, Z.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_ANNOTATIONSXMLFILE')) != -1) {
			// The following attempt to address a missing annotations XML file is a failsafe for attempt in function receiveResponse.
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-CREATINGANNOTATIONSXMLFILE'), false, Z.messageDurationShort, 'center');
			Z.Viewport.createAnnotationsXMLFile();
			// Alternative implementation: Display error intead of creating annotations.xml file.
			//Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ANNOTATIONSXML'), false, Z.messageDurationShort, 'center');
		} else if (url.indexOf(Z.Utils.getResource('DEFAULT_ANNOTATIONSJSONFILE')) != -1) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ANNOTATIONSJSON'), false, Z.messageDurationShort, 'center');
		} else if ((url.toLowerCase().indexOf(Z.Utils.getResource('DEFAULT_ANNOTATIONSXMLFILEHANDLERNAME1')) != -1) || (url.toLowerCase().indexOf(Z.Utils.getResource('DEFAULT_ANNOTATIONSXMLFILEHANDLERNAME1')) != -1)) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ANNOTATIONSFILEHANDLER'), false, Z.messageDurationShort, 'center');
		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST'), false, Z.messageDurationShort, 'center');
		}
	}

	// DEV NOTE: The conditionals in the clause below for the xhr.status values of 200/0/206 are timing dependent and therefore not optimal. They are necessary because
	// the onerror function assigned to the XMLHttpRequest in the function makeNetRequest above will fire on a failure at the network level, not the application level. A 404
	// file not found error is a valid network response so the test must occur here in the onreadystatechange handler. However, here, the url for the request is not known.
	// Note that the onerror can fire in Firefox for a local attempt with a 404 response. Note also that debugger consoles will show the requested url with a 404 response due
	// to privledged access. Future implementation may include a wrapper for the XMLHttpRequest request object that records the url.
	function receiveResponse (xhr, vpID) {				
		if (!xhr) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_NETWORKSECURITY'), false, Z.messageDurationShort, 'center');
		} else if (xhr.status !== 200 && xhr.status !== 0 && xhr.status !== 206) {
			var status = xhr.status;
			var statusText = (status == 404) ? 'Not Found' : xhr.statusText;
			if (status == 404 && xhr.zType == 'loadingImageMetadataXML') {
				Z.Utils.validateCallback('loadingImageMetadataXMLFailed');
			} else if (status == 404 && xhr.zType == 'loadingAnnotationsXML') {
				Z.Utils.validateCallback('loadingAnnotationsXMLFailed');		
			} else if (Z.xmlParametersParsing) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-PARAMETERSXML'), true, null, 'left');
			} else if (Z.Toolbar && !Z.Toolbar.getInitialized()) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-TOOLBARSKINSXML'), true, null, 'left');
			} else if (Z.Viewport && Z.annotationPath !== null && Z.Viewport.getStatus('initializedViewport') && !Z.Viewport.getStatus('XMLParsedViewport')) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-CREATINGANNOTATIONSXMLFILE'), false, Z.messageDurationShort, 'center');
				Z.Viewport.createAnnotationsXMLFile();
			} else if (Z.tileSource == 'ZoomifyZIFFile') {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_NETWORKSTATUSRANGEREQUESTSZIF') + status + ' - ' + statusText, true, null, 'left');
			} else if (Z.tileSource == 'ZoomifyPFFFile') {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_NETWORKSTATUSRANGEREQUESTSPFF') + status + ' - ' + statusText, true, null, 'left');
			} else if (Z.tileSource == 'DZIFolder') {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-IMAGEXML-DZI') + status + ' - ' + statusText, true, null, 'left');
			} else {
				var callbackSet = Z.Utils.verifyCallback('loadingImageXMLFailed');
				if (callbackSet) { 
					Z.Utils.validateCallback('loadingImageXMLFailed');
					console.log(Z.Utils.getResource('ERROR_NETWORKSTATUS') + status + ' - ' + statusText);
				} else {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_NETWORKSTATUS') + status + ' - ' + statusText, false, Z.messageDurationShort, 'center');
				}
			}

		} else if (xhr.zType) {
			var doc = null;
			var annotPathHasJSONExtension = (typeof Z.annotationPath !== 'undefined' && Z.Utils.stringValidate(Z.annotationPath) && Z.annotationPath.toLowerCase().substring(Z.annotationPath.length - 5, Z.annotationPath.length) == '.json');
			if (xhr.zType == 'postingImage' && Z.postingImage) {
				Z.postingImage = false;		
				var callbackSet = Z.Utils.verifyCallback('imageSaveComplete');
				if (callbackSet) { 
						Z.Utils.hideMessage();
						Z.Utils.validateCallback('imageSaveComplete');
				} else {
					Z.Utils.showMessage(Z.Utils.getResource('ALERT_IMAGESAVESUCCESSFUL'), false, Z.messageDurationShort, 'center');
				}

			} else if ((xhr.zType == 'postingFile-narrative' || xhr.zType == 'postingFile-image' || xhr.zType == 'postingFile-media' || xhr.zType == 'postingFile-labelset') && Z.postingFile) {
				Z.postingFile = false;
				if (xhr.zType == 'postingFile-narrative') {
					Z.Utils.validateCallback('narrativeFileUploaded');
				} else if (xhr.zType == 'postingFile-image') {
					Z.Utils.validateCallback('narrativeImageUploaded');
				} else if (xhr.zType == 'postingFile-media') {
					Z.Utils.validateCallback('narrativeMediaUploaded');
				} else if (xhr.zType == 'postingFile-labelset') {
					Z.Utils.validateCallback('narrativeAnnotationFileUploaded');
				}
				Z.Utils.showMessage(Z.Utils.getResource('ALERT_FILEUPLOADSUCCESSFUL'), false, Z.messageDurationShort, 'center');

			} else if (xhr.zType == 'loadingZIFFileBytes' || (xhr.zType == 'loadingImageTile' && Z.tileSource == 'ZoomifyZIFFile')) {
				validateBytes(xhr, vpID, xhr.zType, xhr.zDataType);

			} else if (xhr.zType == 'loadingPFFFileBytes' || (xhr.zType == 'loadingImageTile' && Z.tileSource == 'ZoomifyPFFFile')) {
				validateBytes(xhr, vpID, xhr.zType, xhr.zDataType);

			} else if (xhr.responseType == '' || xhr.responseType == 'document') {
				
				if (xhr.responseXML && xhr.responseXML.documentElement && !annotPathHasJSONExtension) {
					// Pass all XML into dedicated handler.
					doc = xhr.responseXML;
					validateXML(doc, vpID);

				} else if (xhr.responseText) {
					var respText = xhr.responseText;
						
					if (xhr.zType == 'narrativeList' || xhr.zType == 'mediaList' || xhr.zType == 'imageList' || xhr.zType == 'annotationFileList') {
						respText = Z.Utils.stringUnescapeSpaces(respText);
						validateJSON(respText, vpID, xhr.zType);

					} else if (xhr.zType == 'postingHTML') {
						Z.postingHTML = false;
						if (xhr.responseText.indexOf('Failed to save') == -1) {
							Z.Utils.showMessage(Z.Utils.getResource('ALERT_NARRATIVESAVESUCCESSFUL'), false, Z.messageDurationShort, 'center');
							if (Z.narrative) { Z.Utils.validateCallback('narrativeFilePosted'); }
						} else {
							Z.Utils.showMessage('\n' + xhr.responseText, false, Z.messageDurationShort, 'center');
						}

					} else if (xhr.zType == 'loadingAnnotationsJSON' && (respText.indexOf('ANNOTATIONDATA') != -1 || respText.indexOf('ZAS') != -1 || respText.indexOf('Annotations') != -1) && annotPathHasJSONExtension) {
						validateJSON(respText, vpID, 'loadingAnnotationsJSON');

					} else if (xhr.zType == 'postingAnnotationsXML' || xhr.zType == 'postingTrackingXML' || xhr.zType == 'postingImageMetadata') {
						Z.postingXML = false;
						Z.Utils.showMessage(Z.Utils.getResource('ALERT_ANNOTATIONSAVESUCCESSFUL'), false, Z.messageDurationShort, 'center', false, '5');
						if (Z.Viewport) { Z.Viewport.setAllHotspotsSaved(); }
						if (Z.narrative) {
							// Support updating of Labels list in Narratives panel.
							Z.Utils.validateCallback('narrativeAnnotationFilePosted');
						}

					} else if (xhr.zType.indexOf('renamingFile') != -1) {
						if (xhr.responseText.indexOf('Failed to save') == -1) {
							Z.Utils.showMessage(Z.Utils.getResource('ALERT_FILEMANAGERRENAMESUCCESSFUL'), false, Z.messageDurationShort, 'center', false, '5');
							var callbackEventPrefix = 'newFilenamePosted-';
							fileType = xhr.zType.substring(xhr.zType.indexOf('renamingFile-') + ('renamingFile-').length, xhr.zType.length);
							Z.Utils.validateCallback(callbackEventPrefix + fileType);
						} else {
							Z.Utils.showMessage('\n' + xhr.responseText, false, Z.messageDurationShort, 'center');
						}				

					} else if (xhr.zType.indexOf('deletingFile') != -1) {
						if (xhr.responseText.indexOf('Failed to save') == -1) {
							Z.Utils.showMessage(Z.Utils.getResource('ALERT_FILEMANAGERDELETIONSUCCESSFUL'), false, Z.messageDurationShort, 'center', false, '5');
							var callbackEventPrefix = 'fileDeleted-';							
							fileType = xhr.zType.substring(xhr.zType.indexOf('deletingFile-') + ('deletingFile-').length, xhr.zType.length);
							Z.Utils.validateCallback(callbackEventPrefix + fileType);
						} else {
							Z.Utils.showMessage('\n' + xhr.responseText, false, Z.messageDurationShort, 'center');
						}

					} else if (Z.tileSource == 'ZoomifyImageFolder') {
						// Fallback for annotations XML incorrectly sent as Content Type as text/html rather than  as text/xml.
						doc = Z.Utils.xmlConvertTextToDoc(respText);
						validateXML(doc, vpID);

					} else if (Z.tileSource == 'ZoomifyZIFFile') {
						// Fallback for annotations XML incorrectly sent as Content Type  as text/html rather than  as text/xml.
						doc = Z.Utils.xmlConvertTextToDoc(respText);
						validateXML(doc, vpID);

					} else if (Z.tileSource == 'ZoomifyPFFFile') {
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

					} /*else if (Z.tileSource == 'ImageServer') {
						// Example image server protocol implementation.
						// DEV NOTE: Process image server response here.
					}*/
				} 
			}
			
		} else if (Z.tileSource == 'IIIFImageServer') {
			// IIIF JSON data loading handled separately here using tile source rather than xhr.zType in request 
			// header because that requires using POST rather than GET and that creates cross-domain CORS conflict. 
			if (xhr.responseText) { validateJSON(xhr.responseText, vpID, 'loadingIIIFJSON'); }
		}
	}

	function validateBytes (xhrOrBlob, vpID, contentType, dataType, tile, chunkNumber) {
		if (Z.Viewport) {
			if (!Z.useLocalFile) {
				chunkNumber = xhrOrBlob.zChunkNumber;
				tile = xhrOrBlob.zTile;
			}			
			var dataString = (Z.useLocalFile) ? xhrOrBlob : xhrOrBlob.response;			
			var data = new Z.Utils.createUint8Array(dataString, 0);
			if (dataType == 'header') {
				if (Z.tileSourceMultiple === null || typeof vpID === 'undefined' || vpID === null) {
					if (Z.tileSource == 'ZoomifyZIFFile') {
						Z.Viewport.parseZIFHeader(data);
					} else if (Z.tileSource == 'ZoomifyPFFFile') {
						Z.Viewport.parsePFFHeader(data);
					}
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (Z.tileSource == 'ZoomifyZIFFile') {
							if (vpID == i) { Z['Viewport' + i.toString()].parseZIFHeader(data); }
						} else if (Z.tileSource == 'ZoomifyPFFFile') {
							if (vpID == i) { Z['Viewport' + i.toString()].parsePFFHeader(data); }
						}
					}
				}

			} else if (dataType == 'jpegHeaders') {
				if (Z.tileSourceMultiple === null || typeof vpID === 'undefined' || vpID === null) {
					Z.Viewport.parsePFFJPEGHeaders(data);
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parsePFFJPEGHeaders(data); }
					}
				}

			} else if (dataType == 'offset') {
				if (Z.tileSourceMultiple === null || typeof vpID === 'undefined' || vpID === null) {
					if (Z.tileSource == 'ZoomifyZIFFile') {
						Z.Viewport.parseZIFOffsetChunk(data, chunkNumber);
					} else if (Z.tileSource == 'ZoomifyPFFFile') {
						Z.Viewport.parsePFFOffsetChunk(data, chunkNumber);
					}
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (Z.tileSource == 'ZoomifyZIFFile') {
							if (vpID == i) { Z['Viewport' + i.toString()].parseZIFOffsetChunk(data, chunkNumber); }
						} else if (Z.tileSource == 'ZoomifyPFFFile') {
							if (vpID == i) { Z['Viewport' + i.toString()].parsePFFOffsetChunk(data, chunkNumber); }
						}
					}
				}

			} else if (dataType == 'byteCount') {
				// DEV NOTE: PFFs byte counts are handled through offset codeflow due to legacy implementation.
				if (Z.tileSourceMultiple === null || typeof vpID === 'undefined' || vpID === null) {
					Z.Viewport.parseZIFByteCountChunk(data, chunkNumber);
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseZIFByteCountChunk(data, chunkNumber); }
					}
				}
			} else if (dataType && dataType.substring(0,5) == 'image') {
				imagesLoading--;
				if (Z.tileSourceMultiple === null || typeof vpID === 'undefined' || vpID === null) {
					if (Z.tileSource == 'ZoomifyZIFFile') {
						Z.Viewport.parseZIFImage(data, tile, dataType);
					} else if (Z.tileSource == 'ZoomifyPFFFile') {
						Z.Viewport.parsePFFImage(data, tile, dataType);
					}
				} else {					
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (Z.tileSource == 'ZoomifyZIFFile') {
							if (vpID == i) { Z['Viewport' + i.toString()].parseZIFImage(data, tile, dataType); }
						} else if (Z.tileSource == 'ZoomifyPFFFile') {
							if (vpID == i) { Z['Viewport' + i.toString()].parsePFFImage(data, tile, dataType); }
						}
					}
				}

			} else if (dataType == 'gallery') {
				if (Z.tileSourceMultiple === null || typeof vpID === 'undefined' || vpID === null) {
					if (Z.tileSource == 'ZoomifyZIFFile') {
						Z.viewportCurrent.parseZIFImage(data, tile, dataType);
					} else if (Z.tileSource == 'ZoomifyPFFFile') {
						Z.viewportCurrent.parsePFFImage(data, tile, dataType);
					}
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (Z.tileSource == 'ZoomifyZIFFile') {
							if (vpID == i) { Z['Viewport' + i.toString()].parseZIFImage(data, tile, dataType); }
						} else if (Z.tileSource == 'ZoomifyPFFFile') {
							if (vpID == i) { Z['Viewport' + i.toString()].parsePFFImage(data, tile, dataType); }
						}
					}
				}
			} else {
				if (contentType == 'loadingZIFFileBytes' || (contentType == 'loadingImageTile' && Z.tileSource == 'ZoomifyZIFFile')) {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-ZIFBYTES'), false, Z.messageDurationShort, 'center');
				} else if (contentType == 'loadingPFFFileBytes' || (contentType == 'loadingImageTile' && Z.tileSource == 'ZoomifyPFFFile')) {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_MAKINGNETWORKREQUEST-PFFBYTES'), false, Z.messageDurationShort, 'center');
				}
			}
		}
	}

	// Current implementation creates XML from received JSON and passes image properties back to Viewer to reenter image loading process.
	function validateJSON (jsonText, vpID, dataType) {
		var jsonObject = null;
		try {
			jsonObject = JSON.parse(jsonText);
		} catch (e) {
			Z.Utils.showMessage(e.name + Z.Utils.getResource('ERROR_PARSINGANNOTATIONSJSONFILE') + e.message);
		}

		if (jsonObject) {
			if (dataType == 'narrativeList') {
				var dataProvider = Z.Utils.jsonConvertObjectToDataProvider(jsonObject);
				Z.Narrative.configureNarrativeList(dataProvider);

			} else if (dataType == 'imageList') {
				var dataProvider = Z.Utils.jsonConvertObjectToDataProvider(jsonObject);
				Z.Narrative.configureNarrativeImageChoiceList(dataProvider);

			} else if (dataType == 'mediaList') {
				var dataProvider = Z.Utils.jsonConvertObjectToDataProvider(jsonObject);
				Z.Narrative.configureNarrativeMediaChoiceList(dataProvider);

			} else if (dataType == 'annotationFileList') {
				var dataProvider = Z.Utils.jsonConvertObjectToDataProvider(jsonObject);
				Z.Narrative.configureAnnotationFileChoiceListFromNarrative(dataProvider);

			} else if (dataType == 'loadingIIIFJSON') {
				Z.iiifInfoJSONObject = jsonObject;
				var xmlText = '<IMAGE_PROPERTIES WIDTH="' + jsonObject.width + '" HEIGHT="' + jsonObject.height + '" />'
				var xmlDoc = Z.Utils.xmlConvertTextToDoc(xmlText);
				if (typeof vpID === 'undefined' || vpID === null || Z.imageSetLength === null) {
					if (Z.Viewport) { Z.Viewport.parseImageXML(xmlDoc); }
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseImageXML(xmlDoc); }
					}
				}

			} else if (dataType == 'loadingAnnotationsJSON') {
				Z.annotationJSONObject = jsonObject;
				var xmlText = Z.Utils.jsonConvertObjectToXMLText(jsonObject);
				var xmlDoc = Z.Utils.xmlConvertTextToDoc(xmlText);
				if (typeof vpID === 'undefined' || vpID === null) {
					if (Z.Viewport) { Z.Viewport.parseAnnotationsXML(xmlDoc); }
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseAnnotationsXML(xmlDoc); }
					}
				}

			} else if (Z.overlays) { // DEV NOTE: this conditional clause meets needs of 3rd party integrator. May need substitution of dataType == 'loadingOverlayXML'.
				Z.overlayJSONObject = jsonObject;
				var xmlText = Z.Utils.jsonConvertObjectToXMLText(jsonObject);
				var xmlDoc = Z.Utils.xmlConvertTextToDoc(xmlText);
				if (Z.Viewer) { Z.Viewer.parseImageSetXML(xmlDoc, 'overlay'); }

			} else {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_PARSINGANNOTATIONSJSONFILE-TYPEUNKNOWN'));
			}
		}
	}

	function validateXML (xmlDoc, vpID) {
		if (xmlDoc && xmlDoc.documentElement) {
			var rootName = xmlDoc.documentElement.tagName;

			if (Z.xmlParametersParsing) {
				Z.Utils.parseParametersXML(xmlDoc);

			} else if (rootName == 'USERDATA') {
				// Get username list for login validation.
				Z.Utils.parseUsersXML(xmlDoc);

			} else if (rootName == 'COPYRIGHT') {
				// Get text for copyright display.
				var cStatementText = xmlDoc.documentElement.getAttribute('STATEMENTTEXT');
				var cDeclinedText = xmlDoc.documentElement.getAttribute('DECLINEDTEXT');
				if (Z.Utils.stringValidate(cStatementText)) {
					Z.Utils.showCopyright(cStatementText, cDeclinedText);
				} else {
					Z.Utils.showMessage(Z.Utils.getResource('ERROR_IMAGEXMLINVALID'), true);
				}

			} else if ((rootName == 'IMAGE_PROPERTIES') || (rootName == 'ZIFHEADER') || (rootName == 'PFFHEADER') || (rootName == 'Image')) { // 'Image' is root of DZI xml.
				// Pass received image properties XML from file, folder, or other tilesource back to Viewer to reenter image loading process.
				if ((Z.tileSource == 'ZoomifyZIFFile') || (Z.tileSource == 'ZoomifyImageFolder') || (Z.tileSource == 'ZoomifyPFFFile') || (Z.tileSource == 'DZIFolder') || (Z.tileSource == 'ImageServer')) {
					if (Z.imagePath != "multiple") {
						var targetViewport;
						if (typeof vpID === 'undefined' || vpID === null || vpID == 0) {
							targetViewport = Z.Viewport;
						} else {
							targetViewport = Z['Viewport' + vpID.toString()];
						}
						targetViewport.parseImageXML(xmlDoc);
					} else {
						for (var i = 0, j = Z.imageSetLength; i < j; i++) {
							if (vpID == i) { Z['Viewport' + i.toString()].parseImageXML(xmlDoc); }
						}
					}

					// Debug option: Offset a viewport's position relative to others see it more easily.
					//if (vpID == 0) { Z.Viewport0.setSizeAndPosition(900, 550, 150, 0); }
				}

			} else if (rootName == 'PFFOFFSET') {
				// Pass received chunk offset data back to Viewer to reenter tile loading process.
				if (Z.imagePath != "multiple") {
					var targetViewport;
					if (Z.tileSourceMultiple === null || typeof vpID === 'undefined' || vpID === null || vpID == 0) {
						targetViewport = Z.Viewport;
					} else {
						targetViewport = Z['Viewport' + vpID.toString()];
					}
					targetViewport.parsePFFOffsetChunkServlet(xmlDoc);
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parsePFFOffsetChunkServlet(xmlDoc); }
					}
				}

			} else if (rootName == 'SKINDATA') {
				// Pass received skin data back to Viewer.
				if (typeof Z.xmlCallbackFunction === 'function') {
					Z.xmlCallbackFunction(xmlDoc);
				} else if (Z.Toolbar) {
					Z.Toolbar.parseSkinXML(xmlDoc);
				}

			} else if (rootName == 'IMAGEMETADATA') {
				// Pass received image metadata XML back to Viewer to reenter list loading process.
				if (Z.Viewport) { Z.Viewport.parseImageMetadataXML(xmlDoc); }

			} else if (rootName == 'IMAGELISTDATA') {
				// Pass received image list XML back to Viewer to reenter list loading process.
				if (Z.tileSourceMultiple === null || typeof vpID === 'undefined' || vpID === null) {
					if (Z.Viewport) { Z.Viewport.parseImageListXML(xmlDoc); }
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseImageListXML(xmlDoc, vpID); }
					}
				}

			} else if (rootName == "COMPARISONDATA") {
				// Pass received image set XML back to Viewer to reenter image set loading process.
				if (Z.Viewer) { Z.Viewer.parseImageSetXML(xmlDoc, 'comparison'); }

			} else if (rootName == "OVERLAYDATA") {
				// Pass received image set XML back to Viewer to reenter image set loading process.
				if (Z.Viewer) { Z.Viewer.parseImageSetXML(xmlDoc, 'overlay'); }

			} else if (rootName == 'SLIDEDATA') {
				// Pass received slides XML back to Viewer to reenter slide loading process.
				if (Z.Viewport) { Z.Viewport.parseSlidesXML(xmlDoc); }

			} else if (rootName == 'HOTSPOTDATA') {
				// Pass received hotspot XML back to Viewer to reenter hotspot loading process.
				if (typeof vpID === 'undefined' || vpID === null) {
					if (Z.Viewport) { Z.Viewport.parseHotspotsXML(xmlDoc); }
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseHotspotsXML(xmlDoc); }
					}
				}

			} else if (rootName == "ANIMATIONDATA") {
				// Pass received image set XML back to Viewer to reenter image set loading process.
				if (Z.Viewer) { Z.Viewer.parseImageSetXML(xmlDoc, 'animation'); }

			} else if (rootName == 'GEODATA') {
				if (Z.Viewport) { Z.Viewport.parseGeoCoordinatesXML(xmlDoc); }

			} else if (rootName == 'ANNOTATIONDATA' || rootName == 'ZAS' || rootName == 'Annotations') { // 'Annotations' root tag value indicates Aperio data.
				// Pass received annotation XML back to Viewer to reenter annotation loading process.
				if (Z.tileSourceMultiple === null || typeof vpID === 'undefined' || vpID === null) {
					if (Z.Viewport) {
					Z.Viewport.parseAnnotationsXML(xmlDoc); }
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseAnnotationsXML(xmlDoc, vpID); }
					}
				}

			} else if (rootName == "SLIDESTACKDATA") {
				// Pass received image set XML back to Viewer to reenter image set loading process.
				if (Z.Viewer) { Z.Viewer.parseImageSetXML(xmlDoc, 'slidestack'); }

			} else if (rootName == "TRACKINGDATA") {
				// Pass received tracking XML back to Viewer to reenter tracking panel loading process.
				if (typeof vpID === 'undefined' || vpID === null) {
					if (Z.Viewport) { Z.Viewport.parseTrackingXML(xmlDoc); }
				} else {
					for (var i = 0, j = Z.imageSetLength; i < j; i++) {
						if (vpID == i) { Z['Viewport' + i.toString()].parseTrackingXML(xmlDoc, vpID); }
					}
				}

			} else if (Z.postingImage) {
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_SAVEIMAGEHANDLERPATHINVALID'), true);

			} else {
				// Is there a problem here saving to image file or only and xml error because missing a condition specific to a different error?
				//console.log(Z.Utils.xmlConvertDocToText(xmlDoc));
				Z.Utils.showMessage(Z.Utils.getResource('ERROR_XMLINVALID'), true);
			}

		} else {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_XMLDOCINVALID'), true);
		}
	}

	this.loadImage = function (src, callback, contentType, dataType, tile, vpID) {
		loadImage(src, callback, contentType, dataType, tile, vpID);
	}

	function loadImage (src, callback, contentType, dataType, tile, vpID) {
		if (imagesLoading < IMAGES_LOADING_MAX) {
			imagesLoading++;					
			if ((Z.tileSource == 'ZoomifyZIFFile' || (Z.tileSource == 'ZoomifyPFFFile' && Z.tileHandlerPathFull === null)) && ((typeof tile !== 'undefined' && tile !== null) || contentType == 'navigator')) {
				loadImageByteRange(src, contentType, dataType, tile, vpID);				
			} else {
				var func = Z.Utils.createCallback(null, onComplete, callback);
				var imageNetRequest = new ImageNetRequest(src, func, contentType);
				imageNetRequest.start();
			}
			return true;

		} else {
			var index = Z.Utils.arrayIndexOfObjectValue(loadImageQueue, 'sc', src);
			if (index == -1) {
				loadImageQueue[loadImageQueue.length] = { sc:src, cb:callback, ct:dataType, t:tile };
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
		var loadingImage = loadImage(qNext.sc, qNext.cb, 'loadingImageFromQueue', qNext.ct, qNext.t);
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
				Z.Utils.showMessage(e.name + Z.Utils.getResource('ERROR_EXECUTINGCALLBACK') + src + ' ' + e.message, true);
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
				console.log(Z.Utils.getResource('ERROR_IMAGEREQUESTTIMEDOUT')); // Options for showMessage:, false, Z.messageDurationShort, 'center');
				complete(false);

				Z.Viewport.traceDebugValues('imageRequestTimeout', contentType + ' timeout: ' + src);
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

	addCrossBrowserMethods : function () {
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

	addCrossBrowserEvents : function () {
		// Meta events model is used only to ensure consistent event listener methods.
		// Specific browser differences are managed within each event handler.
		if (document.addEventListener) {
			// W3C DOM 2 Events model

			this.addEventListener = function (target, eventName, handler) {
				if (target) {
					if (eventName == 'mousewheel') { target.addEventListener('DOMMouseScroll', handler, false); }
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

	declareGlobals : function () {
		// IMAGE & SKIN
		Z.pageContainerID = null;
		Z.pageContainer = null;
		Z.imagePath = null;
		Z.usingDirectoryExtensions = null;
		Z.imageFilename = null;
		Z.imagePath2 = null;
		Z.imageMetadataXML = null;
		Z.parameters = null;
		Z.xmlParametersPath = null;
		Z.xMLParametersPath = null; // Lower case 'xml' version above used internally. This version prevents error message in function setParameters.
		Z.xmlParametersParsing = null;
		Z.xMLParametersParsing = null; // Lower case 'xml' version above used internally. This version prevents error message in function setParameters.
		Z.skinPath = null;
		Z.skinMode = null;
		Z.cacheProofCounter = 0;
		Z.timerCounter = 0;

		// PAGE & BROWSER
		Z.platform = null;
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
		Z.ellipseDrawingSupported = null;
		Z.rotationSupported = null;
		Z.fullScreenSupported = null;
		Z.arrayMapSupported = null;
		Z.arraySpliceSupported = null;
		Z.float32ArraySupported = null;
		Z.uInt8ArraySupported = null;		
		Z.localFilesSupported = null;
		Z.useLocalFile = null;
		Z.localFile = null;		
		Z.xmlHttpRequestSupport = null;
		Z.definePropertySupported = null;
		Z.responseArraySupported = null;
		Z.responseArrayPrototyped = false;
		Z.definedObjectPropertiesArr = [];
		Z.touchSupport = null;
		Z.gestureSupport = null;
		Z.mobileDevice = null;
		Z.localUse = null;
		Z.singleFileSupported = null;

		// VIEWER OPTIONS & DEFAULTS
		Z.onReady = null;
		Z.onAnnotationReady = null;
		Z.initialX = null;
		Z.initialY = null;
		Z.initialZ = null;
		Z.initialZoom = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.minZ = null;
		Z.minZoom = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.maxZ = null;
		Z.maxZoom = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.zoomSpeed = null;
		Z.panSpeed = null;
		Z.smoothPan = null;
		Z.smoothPanEasing = null;
		Z.smoothZoom = null;
		Z.smoothZoomEasing = null;
		Z.smoothPanGlide = null;
		Z.autoResize = null;
		Z.fadeIn = null;
		Z.fadeInSpeed = null;
		Z.toolbarInternal = null;
		Z.toolbarVisible = null;
		Z.toolbarBackgroundVisible = null;
		Z.toolbarAutoShowHide = null;
		Z.toolbarW = null;
		Z.toolbarH = null;
		Z.toolbarPosition = null;
		Z.navigatorVisible = null;
		Z.navigatorW = null;
		Z.navigatorWidth = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.navigatorH = null;
		Z.navigatorHeight = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.navigatorL = null;
		Z.navigatorLeft = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.navigatorT = null;
		Z.navigatorTop = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.navigatorFit = null;
		Z.navigatorRectangleColor = null;
		Z.GalleryScrollPanel = null;
		Z.galleryVisible = null;
		Z.galleryM = null;
		Z.galleryAutoShowHide = null;
		Z.galleryW = null;
		Z.galleryWidth = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.galleryH = null;
		Z.galleryHeight = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.galleryL = null;
		Z.galleryT = null;
		Z.galleryPosition = null;
		Z.galleryRectangleColor = null;
		Z.mouseIsDownGallery = null;
		Z.clickZoom = null;
		Z.doubleClickZoom = null;
		Z.doubleClickDelay = null;
		Z.clickPan = null;
		Z.zoomAndPanInProgressID = null;
		Z.clickZoomAndPanBlock = false;
		Z.mousePan = null;
		Z.keys = null;
		Z.constrainPan = null;
		Z.constrainPanLimit = null;
		Z.constrainPanStrict = null;
		Z.panBuffer = null;
		Z.tooltipsVisible = null;
		Z.helpVisible = null;
		Z.helpPath = null;
		Z.helpCustom = false;
		Z.helpContent = null;
		Z.helpW = null;
		Z.helpWidth = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.helpH = null;
		Z.helpHeight = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.helpL = null;
		Z.helpLeft = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.helpT = null;
		Z.helpTop = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.minimizeVisible = null;
		Z.sliderZoomVisible = null;
		Z.sliderVisible = null; // Deprecated. Now Z.sliderZoomVisible. HTML parameter still zSliderVisible. This set here to prevent specific error message in function setParameters.
		Z.zoomButtonsVisible = null;
		Z.panButtonsVisible = null;
		Z.resetVisible = null;

		Z.fullViewVisible = null;
		Z.fullScreenVisible = null;
		Z.fullPageVisible = null;
		Z.initialFullPage = null;
		Z.fullPageInitial = null; // Deprecated. Set here to enable specific error message in function setParameters.
		Z.fullScreenEntering = null;

		Z.progressVisible = null;
		Z.messagesVisible = null;
		Z.logoVisible = null;
		Z.logoLink = null;
		Z.logoLinkURL = null;
		Z.logoCustomPath = null;

		Z.bookmarksGet = null;
		Z.bookmarksSet = null;

		Z.copyrightPath = null;
		Z.watermarkPath = null;
		Z.watermarks = null;

		Z.virtualPointerVisible = null;
		Z.virtualPointerPath = null;
		Z.crosshairsVisible = null;
		Z.zoomRectangle = null;

		Z.rulerVisible = null;
		Z.units = null;
		Z.unitsPerImage = null;
		Z.pixelsPerUnit = null;
		Z.sourceMagnification = null;
		Z.magnification = null; //  Deprecated. Set here to enable specific error message in function setParameters.
		Z.rulerListType = null;
		Z.rulerW = null;
		Z.rulerWidth = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.rulerH = null;
		Z.rulerHeight = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.rulerL = null;
		Z.rulerLeft = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.rulerT = null;
		Z.rulerTop = null; // Concise version above used internally. This long version prevents error message in function setParameters.
		Z.measureVisible = false;
		Z.rotationVisible = null;
		Z.rotationFree = null;
		Z.initialR = null;
		Z.initialRotation = null; // Concise version above used internally. This long version prevents error message in function setParameters.

		Z.imageListPath = null;
		Z.imageList = null;
		Z.imageListTitle = null;
		Z.imageListFolder = null;
		Z.imageListFileShared = false;
		Z.imageSetImageListPath = null;
		Z.imageListTimeout = null;

		Z.screensaver = false;
		Z.screensaverSpeed = null;
		Z.tour = false;
		Z.tourPath = null;
		Z.tourListTitle = null;
		Z.tourPlaying = null;
		Z.tourStop = false;

		Z.comparison = false;
		Z.comparisonPath = null; // Supports zComparisonPath parameter test.
		Z.syncVisible = null;
		Z.initialSync = null;
		Z.syncComparison = null;

		Z.slideshow = false;
		Z.slidePath = null;
		Z.slideListTitle = null;
		Z.slideButtonsVisible = null;
		Z.slideshowPlaying = null;
		Z.slideshowStopping = null;
		Z.slideTransitionTimeout = null;
		Z.slideTransitionSpeed = null;
		Z.slideOpacity = 0;

		Z.audioContent = false;
		Z.audioMuted = false;
		Z.audioPlaying = null;
		Z.audioStopped = null;

		Z.hotspots = false;
		Z.hotspotPath = null;
		Z.hotspotFolder = null;
		Z.hotspotListTitle = null;
		Z.hotspotsDrawOnlyInView = true;
		Z.captionBoxes = false;
		Z.captionsColorsDefault = true;
		Z.captionOffset = null;

		Z.maskVisible = null;
		Z.maskScale = null;
		Z.maskBorder = null;
		Z.maskingSelection = false;
		Z.maskFadeTimeout = null;
		Z.maskFadeSpeed = null;
		Z.maskOpacity = 0;
		Z.maskClearOnUserAction = null;

		Z.annotations = false;
		Z.annotationPath = null;
		Z.annotationFolder = null;
		Z.annotationXMLText = null;
		Z.labelShapesInternal = null;
		Z.annotationJSONObject = null;
		Z.annotationsAddMultiple = null;
		Z.annotationsAutoSave = null;
		Z.annotationsAutoSaveImage = null;
		Z.annotationPanelVisible = null; // Include panel in interface.
		Z.annotationPanelVisibleState = false; // Show or hide panel currently.
		
		Z.clickURLEntryVisible = null;

		Z.saveButtonVisible = null;

		Z.labelClickSelect = null;
		Z.labelHighlight = null;
		Z.simplePath = false;
		Z.noPost = false;
		Z.noPostDefaults = true;
		Z.unsavedEditsTest = true;

		Z.externalEditPermissionFunction = null; // Value must be function to be invoked. Function must return true or false.
		Z.annotationSort = 'none';

		Z.annotationXMLAperioLoad = null;					
		Z.annotationXMLAperioPost = null;

		Z.fileHandlerPath = null;
		Z.fileHandlerProvided = false;
		Z.saveHandlerPath = null;
		Z.saveImageHandlerPath = null;
		Z.saveImageFull = null;
		Z.postingXML = false;
		Z.postingHTML = false;
		Z.postingImage = false;
		Z.postingFile = false;
		
		Z.magnifierVisible = null;
		Z.magnifierW = null;
		Z.magnifierH = null;
		Z.magnifierL = null;
		Z.magnifierT = null;
				
		Z.narrativePath = null;
		Z.narrativeFolderPath = null;
		Z.narrativeImageFolderPath = null;
		Z.narrativeMediaFolderPath = null;
		Z.narrativeAnnotationFolderPath = null;
		Z.narrative = null;
		Z.narrativeMode = null;
		Z.narrativeW = 0;
		Z.narrativeImageListTitle = null;
		Z.narrativePathProvided = false;
		Z.narrativeHelpPath = null;
		Z.narrativeHelpContent = null;
		Z.narrativeText = null;
		Z.narrativeTextPrior = null;
		Z.annotationFileList = null;

		Z.coordinatesVisible = null;
		Z.geoCoordinatesPath = null;
		Z.geoCoordinatesVisible = null;
		Z.geoCoordinatesFolder = null;

		Z.preloadVisible = null;

		Z.imageFilters = null;
		Z.imageFiltersVisible = null;
		Z.initialImageFilters = null;
		Z.brightnessVisible = null;
		Z.contrastVisible = null;
		Z.sharpnessVisible = null;
		Z.blurrinessVisible = null;
		Z.colorRedVisible = null;
		Z.colorGreenVisible = null;
		Z.colorBlueVisible = null;
		Z.colorRedRangeVisible = null;
		Z.colorGreenRangeVisible = null;
		Z.colorBlueRangeVisible = null;
		Z.gammaVisible = null;
		Z.gammaRedVisible = null;
		Z.gammaGreenVisible = null;
		Z.gammaBlueVisible = null;
		Z.hueVisible = null;
		Z.saturationVisible = null;
		Z.lightnessVisible = null;
		Z.whiteBalanceVisible = null;
		Z.normalizeVisible = null;
		Z.equalizeVisible = null;
		Z.noiseVisible = null;
		Z.grayscaleVisible = null;
		Z.thresholdVisible = null;
		Z.inversionVisible = null;
		Z.edgesVisible = null;
		Z.sepiaVisible = null;	

		Z.saveImageFull = null;
		Z.saveImageFilename = null;
		Z.saveImageFormat = null;
		Z.saveImageCompression = null;
		Z.saveImageBackColor = null;

		Z.tracking = false;
		Z.trackingPath = null;
		Z.trackingFolder = null;
		Z.trackingPathProvided = false;
		Z.trackingEditMode = false;
		Z.trackingFileShared = false;
		Z.imageSetTrackingPath = null;
		Z.trackingPanelPosition = null;
		Z.trackingCounts = [];
		Z.trackingTypeCurrent = '0';
		Z.trackingOverlayVisible = false;
		Z.initialTrackingOverlayVisible = null;
		Z.trackingCellCurrent = null;
		Z.trackingPanelVisible = null; // Include panel in interface.
		Z.trackingPanelVisibleState = false; // Show or hide panel currently.

		Z.userName = null;
		Z.userInitials = null;
		Z.userLogin = null;
		Z.userNamePrompt = null;
		Z.userNamePromptRetry = null;
		Z.userPath = null;
		Z.userFolder = null;
		Z.userPathProvided = false;
		Z.userList = [];
		Z.userLogging = false;
		Z.UserPanel = null;
		Z.userPanelVisible = null; // Include panel in interface.
		Z.userPanelPosition = 0;
		Z.userPanelVisibleState = false; // Show or hide panel currently.

		Z.canvas = null;
		Z.baseZIndex = null;
		Z.debug = null;
		Z.hideOverlayBackfill = null;
		Z.imageProperties = null;
		Z.serverIP = null;
		Z.serverPort = null;
		Z.tileHandlerPath = null;
		Z.tileHandlerPathFull = null;

		Z.iiifInfoJSONObject =null;
		Z.iiifScheme = null;
		Z.iIIFScheme = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		Z.iiifServer = null;
		Z.iIIFServer = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		Z.iiifPrefix = null;
		Z.iIIFPrefix = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		Z.iiifIdentifier = null;
		Z.iIIFIdentifier = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		Z.iiifRegion = null;
		Z.iIIFRegion = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		Z.iiifSize = null;
		Z.iIIFSize = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		Z.iiifRotation = null;
		Z.iIIFRotation = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		Z.iiifQuality = null;
		Z.iIIFQuality = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.
		Z.iiifFormat = null;
		Z.iIIFFormat = null; // Lower case 'iiif' version above used internally. This version prevents error message in function setParameters.

		Z.tileW = null;
		Z.tileH = null;
		Z.tileType = 'jpg';
		Z.tilesPNG = null;  // Deprecated.  zTilesPNG now sets Z.tileType above. Set here to enable specific error message in function setParameters.
		Z.fieldOfViewVisible = null;
		Z.freehandVisible = null;
		Z.textVisible = null;
		Z.shapeVisible = null;
		Z.rectangleVisible = null;
		Z.polygonVisible = null;
		Z.captionTextColor = null;
		Z.captionBackColor = null;
		Z.labelLineColor = null;
		Z.labelFillColor = null;
		Z.captionTextVisible = true;
		Z.captionBackVisible = true;
		Z.labelFillVisible = false;
		Z.labelLineVisible = true;
		
		Z.captionPosition = null;

		Z.annotationPathProvided = false;
		Z.saveHandlerProvided = false;
		Z.fileHandlerProvided = false;
		Z.imageSetPathProvided = false;
		Z.slidePathProvided = false;
		Z.saveImageHandlerProvided = false;
		Z.tileSource = null;
		Z.requestTiles = false;
		Z.tileSourceMultiple = null;
		Z.pffJPEGHeadersSeparate = false;
		Z.dziSubfoldersToSkip = null;		
		Z.dziImagePropertiesFilename = null;
		Z.dziImageSubfolder = null;
		Z.focal = null;
		Z.quality = null;
		Z.markupMode = null; // Used only to ensure zMarkupMode validity test does not return 'undefined'.
		Z.editMode = null; // Supported values: null, 'edit', 'markup'.
		Z.editAdmin = false; // Supported values: false (default), true.
		Z.editing = null; // Supported values: null, 'addPOI', 'editPOI', 'addLabel', 'editLabel', 'addNote', 'editNote'.
		Z.labelMode = 'view'; // Supported values: 'view', 'fieldofview', 'text', 'shape', 'freehand', 'polygon', 'measure', 'counter'.
		Z.editModePrior = Z.editMode;
		Z.xmlCallbackFunction = null;
		Z.labelClickDrag = true;

		Z.sliderFocus = 'zoom';
		Z.overlayPath = null; // Supports zOverlayPath parameter test.
		Z.overlays = false;
		Z.overlayJSONObject = null;
		Z.overlaysInitialVisibility = null;
		Z.animation = false;
		Z.animationPath = null; // Supports zAnimationPath parameter test.
		Z.animationCount = 0;
		Z.animationAxis = null;
		Z.animator = null;
		Z.animationFlip = null;
		Z.slidestack = false;
		Z.slidestackPath = null; // Supports zSlidestackPath parameter test.
		Z.imageSet = false;
		Z.imageSetPath = null;
		Z.imageSetLength = null;
		Z.imageSetListPosition = null;
		Z.imageSetListTitle = null;
		Z.imageSetStart = null;
		Z.imageSetLoop = null;
		Z.sliderImageSetVisible = null;
		Z.mouseWheelParmeterProvided = null;
		Z.mouseWheel = null;
		Z.imageSetHotspotPath = null;
		Z.hotspotFileShared = false;
		Z.imageSetAnnotationPath = null;
		Z.annotationFileShared = false;

		// VIEWER COMPONENTS & STATE VALUES
		Z.messageDurationLong = parseInt(Z.Utils.getResource('DEFAULT_MESSAGEDURATIONLONG'), 10);
		Z.messageDurationStandard = parseInt(Z.Utils.getResource('DEFAULT_MESSAGEDURATIONSTANDARD'), 10);
		Z.messageDurationShort = parseInt(Z.Utils.getResource('DEFAULT_MESSAGEDURATIONSHORT'), 10);
		Z.messageDurationVeryShort = parseInt(Z.Utils.getResource('DEFAULT_MESSAGEDURATIONVERYSHORT'), 10);
		Z.Viewer = null;
		Z.ViewerDisplay = null;
		Z.Viewport = null;
		Z.Toolbar = null;
		Z.ToolbarDisplay = null;
		Z.ToolbarMinimized = false;
		Z.TooltipDisplay = null;
		Z.Navigator = null;
		Z.Navigator2 = null;
		Z.NavigatorDisplay = null;
		Z.MessageDisplay = null;
		Z.messages = null;
		Z.messageDisplayList = [];
		Z.overlayMessage = null;
		Z.CoordinatesDisplay = null;
		Z.coordinates = null;
		Z.coordinatesSave = null;
		Z.CopyrightDisplay = null;
		Z.imageW = null;
		Z.imageH = null;
		Z.imageD = null;
		Z.imageCtrX = null;
		Z.imageCtrY = null;
		Z.imageX = 0;
		Z.imageY = 0;
		Z.imageZ = 0;
		Z.imageR = 0;
		Z.priorX = 0;
		Z.priorY = 0;
		Z.priorZ = 0;
		Z.priorR = 0;
		Z.preventDupCall = false;
		Z.fitZ = null;
		Z.fillZ = null;
		Z.zooming = 'stop';
		Z.panningX = 'stop';
		Z.panningY = 'stop';
		Z.rotating = 'stop';
		Z.fullView = false;
		Z.fullViewPrior = false;
		Z.interactive = true;
		Z.useCanvas = true;
		Z.expressParamsEnabled = null;
		Z.proParamsEnabled = null;
		Z.specialStorageEnabled = null;
		Z.enterpriseParamsEnabled = null;
		Z.updateViewPercent = 0;
		Z.TraceDisplay = null;
		Z.traces = null;
		Z.mouseIsDown = false;
		Z.buttonIsDown = false;
		Z.keyIsDown = false;
		Z.altKeyIsDown = false;
		Z.mouseWheelIsDown = false;
		Z.mouseWheelCompleteDuration = null;
		Z.mouseWheelCompleteTimer = null;
		Z.mouseOutDownPoint = null;
		
		maxTier = 0;
		maxTileR = 0;
		maxTileB = 0;

		// ImageSet support.
		Z.viewportCurrentID = 0;
		Z.viewportCurrent = null;
		Z.viewportChangeTimeout = null;
	},

	detectBrowserFeatures : function () {
		// Detect platform.
		var uA = window.navigator.userAgent;
		var platform = (uA.indexOf('Win') != -1) ? 'windows' : (uA.indexOf('Mac') != -1) ? 'macintosh' : 'other';

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
		var ellipseDrawingSupported = canvasSupported && !!(elem.getContext('2d').ellipse);

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

		// Detect local access - alert users of Chrome/Opera/IE11 (folders) and ZIF/PFF (all browsers).
		var localUse;
		switch (window.location.protocol) {
			case 'http:':
				localUse = false;
				break;
			case 'https:':
				localUse = false;
				break;
			case 'file:':
				localUse = true;
				break;
			default:
				localUse = null;
				break;
		}

		// Detect browser use not supporting single file storage. Access not supported on IE <= v8 and Opera <= v12 and most pre-canvas browsers.
		// Numerous browsers with limited adoption not tested and functional failures will present specific errors rather than general ZIF support message.
		var singleFileSupported = !((Z.browser == Z.browsers.IE && Z.browserVersion < 9) || (Z.browser == Z.browsers.OPERA && Z.browserVersion < 15) || (Z.browser == Z.browsers.CHROME && Z.browserVersion < 25) && (Z.browser == Z.browsers.FIREFOX && Z.browserVersion < 20) && (Z.browser == Z.browsers.SAFARI && Z.browserVersion < 5));

		// Set global variables.
		Z.platform = platform;
		Z.browser = browser;
		Z.browserVersion = browserVersion;
		Z.scaleThreshold = scaleThreshold;		
		Z.localFilesSupported = localFilesSupported;
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
		Z.ellipseDrawingSupported = ellipseDrawingSupported;
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
		Z.localUse = localUse;
		Z.singleFileSupported = singleFileSupported;
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::: PARAMETER & RESOURCE UTILITY FUNCTIONS ::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	parseParametersXML : function (xmlDoc) {
		Z.xmlParametersParsing = false;
		var optionalParams = '';
		var embedRoot = xmlDoc.getElementsByTagName('ZOOMIFY')[0];

		// Get image path values and apply.
		zImagePath = embedRoot.getAttribute('IMAGEPATH');
		zImagePath2 = embedRoot.getAttribute('IMAGEPATH2');
		if (typeof zImagePath !== 'undefined' && Z.Utils.stringValidate(zImagePath)) { Z.imagePath = zImagePath; }
		if (typeof zImagePath2 !== 'undefined' && Z.Utils.stringValidate(zImagePath2)) { Z.imagePath2 = zImagePath2; }

		// Get values with standard parameter names.
		var parameterListTextArray = Z.Utils.getResource('DEFAULT_PARAMETERLISTTEXT').split(',');
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
		Z.Utils.arrayClear(Z.parameters);
		Z.parameters = Z.Utils.parseParameters(optionalParamsFullyUnescaped);
		Z.initialize();
	},

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

	setParameters : function (params) {
		var expressParamsEnableTest = this.getResource('DEFAULT_EXPRESSPARAMETERSENABLETEST');
		var expressParamsDisableValue = this.getResource('DEFAULT_EXPRESSPARAMETERSDISABLEVALUE');
		var expressParamsDisabledAlert = this.getResource('DEFAULT_EXPRESSPARAMETERSDISABLEDALERT');
		Z.expressParamsEnabled = (expressParamsEnableTest != expressParamsDisableValue) ? true : false;
		if (!Z.expressParamsEnabled) {
			Z.toolbarInternal = true;
			// Alternative implementation: full toolbar with link on Zoomify logo.
			//Z.logoLinkURL = Z.Utils.getResource('UI_LOGOLINK');
		}

		var proParamsEnableTest = this.getResource('DEFAULT_PROPARAMETERSENABLETEST');
		var proParamsDisableValue = this.getResource('DEFAULT_PROPARAMETERSDISABLEVALUE');
		var proParamsDisabledAlert = this.getResource('DEFAULT_PROPARAMETERSDISABLEDALERT');
		Z.proParamsEnabled = (proParamsEnableTest != proParamsDisableValue) ? true : false;

		var specialStorageEnableTest = this.getResource('DEFAULT_SPECIALSTORAGESUPPORTENABLETEST');
		var specialStorageDisableValue = this.getResource('DEFAULT_SPECIALSTORAGESUPPORTDISABLEVALUE');
		var specialStorageDisabledAlert = this.getResource('DEFAULT_SPECIALSTORAGESUPPORTDISABLEDALERT');
		Z.specialStorageEnabled = (specialStorageEnableTest != specialStorageDisableValue) ? true : false;

		var enterpriseParamsEnableTest = this.getResource('DEFAULT_ENTERPRISEPARAMETERSENABLETEST');
		var enterpriseParamsDisableValue = this.getResource('DEFAULT_ENTERPRISEPARAMETERSDISABLEVALUE');
		var enterpriseParamsDisabledAlert = this.getResource('DEFAULT_ENTERPRISEPARAMETERSDISABLEDALERT');
		Z.enterpriseParamsEnabled = (enterpriseParamsEnableTest != enterpriseParamsDisableValue) ? true : false;

		if (Z.skinPath === null) { Z.skinPath = this.getResource('DEFAULT_SKINXMLPATH'); }
		if (Z.skinMode === null) { Z.skinMode = this.getResource('DEFAULT_SKINMODE'); }

		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALX')))) { Z.initialX = parseFloat(this.getResource('DEFAULT_INITIALX')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALY')))) { Z.initialY = parseFloat(this.getResource('DEFAULT_INITIALY')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALZOOM')))) { Z.initialZ = parseFloat(this.getResource('DEFAULT_INITIALZOOM')); }
		if (Z.minZ === null && !isNaN(parseFloat(this.getResource('DEFAULT_MINZOOM')))) { Z.minZ = parseFloat(this.getResource('DEFAULT_MINZOOM')); }
		if (Z.maxZ === null && !isNaN(parseFloat(this.getResource('DEFAULT_MAXZOOM')))) { Z.maxZ = parseFloat(this.getResource('DEFAULT_MAXZOOM')); }
		if (Z.zoomSpeed === null && !isNaN(parseFloat(this.getResource('DEFAULT_ZOOMSPEED')))) { Z.zoomSpeed = parseFloat(this.getResource('DEFAULT_ZOOMSPEED')); }
		if (Z.panSpeed === null && !isNaN(parseFloat(this.getResource('DEFAULT_PANSPEED')))) { Z.panSpeed = parseFloat(this.getResource('DEFAULT_PANSPEED')); }
		if (Z.fadeInSpeed === null && !isNaN(parseFloat(this.getResource('DEFAULT_FADEINSPEED')))) { Z.fadeInSpeed = parseFloat(this.getResource('DEFAULT_FADEINSPEED')); }
		Z.fadeIn = (Z.fadeInSpeed > 0);

		if (Z.navigatorVisible === null) { Z.navigatorVisible = parseInt(this.getResource('DEFAULT_NAVIGATORVISIBLE'), 10); }
		if (Z.navigatorW === null) { Z.navigatorW = parseInt(this.getResource('DEFAULT_NAVIGATORWIDTH'), 10); }
		if (Z.navigatorH === null) { Z.navigatorH = parseInt(this.getResource('DEFAULT_NAVIGATORHEIGHT'), 10); }
		if (Z.navigatorL === null) { Z.navigatorL = parseInt(this.getResource('DEFAULT_NAVIGATORLEFT'), 10); }
		if (Z.navigatorT === null) { Z.navigatorT = parseInt(this.getResource('DEFAULT_NAVIGATORTOP'), 10); }
		if (Z.navigatorFit === null) { Z.navigatorFit = this.getResource('DEFAULT_NAVIGATORFIT'); }
		if (Z.navigatorRectangleColor === null) { Z.navigatorRectangleColor = this.getResource('DEFAULT_NAVIGATORRECTANGLECOLOR'); }

		if (Z.galleryVisible === null || Z.slideshow) { Z.galleryVisible = parseInt(this.getResource('DEFAULT_GALLERYVISIBLE'), 10); }
		if (Z.galleryAutoShowHide === null || Z.slideshow) { Z.galleryAutoShowHide = (Z.galleryVisible == 2); }
		if (Z.galleryW === null) { Z.galleryW = parseInt(this.getResource('DEFAULT_GALLERYWIDTH'), 10); }
		if (Z.galleryH === null) { Z.galleryH = parseInt(this.getResource('DEFAULT_GALLERYHEIGHT'), 10); }
		if (Z.galleryM === null) { Z.galleryM = parseInt(this.getResource('DEFAULT_GALLERYMARGIN'), 10); }
		if (Z.galleryL === null) { Z.galleryL = parseInt(this.getResource('DEFAULT_GALLERYLEFT'), 10); }
		if (Z.galleryT === null) { Z.galleryT = parseInt(this.getResource('DEFAULT_GALLERYTOP'), 10); }
		if (Z.galleryPosition === null) { Z.galleryPosition = parseFloat(this.getResource('DEFAULT_GALLERYPOSITION')); }
		if (Z.galleryRectangleColor === null) { Z.galleryRectangleColor = this.getResource('DEFAULT_GALLERYRECTANGLECOLO R'); }

		if (Z.clickZoom === null) { Z.clickZoom = (this.getResource('DEFAULT_CLICKZOOM') != '0'); }
		if (Z.doubleClickZoom === null) { Z.doubleClickZoom = (this.getResource('DEFAULT_DOUBLECLICKZOOM') != '0'); }
		if (Z.doubleClickDelay === null) { Z.doubleClickDelay = parseFloat(this.getResource('DEFAULT_DOUBLECLICKDELAY')); }
		if (Z.clickPan === null) { Z.clickPan = (this.getResource('DEFAULT_CLICKPAN') != '0'); }
		if (Z.mousePan === null) { Z.mousePan = (this.getResource('DEFAULT_MOUSEPAN') != '0'); }
		if (Z.constrainPan === null) { Z.constrainPan = (this.getResource('DEFAULT_CONSTRAINPAN') != '0'); }
		if (Z.constrainPanLimit === null) { Z.constrainPanLimit = parseInt(this.getResource('DEFAULT_CONSTRAINPANLIMIT'), 10); }
		if (Z.constrainPanStrict === null) { Z.constrainPanStrict = (this.getResource('DEFAULT_CONSTRAINPANSTRICT') != '0'); }
		if (Z.panBuffer === null) { Z.panBuffer = parseFloat(this.getResource('DEFAULT_PANBUFFER')); }
		if (Z.smoothPan === null) { Z.smoothPan = (Z.useCanvas && !Z.comparison && this.getResource('DEFAULT_SMOOTHPAN') != '0'); }
		if (Z.smoothPanEasing === null) { Z.smoothPanEasing = parseInt(this.getResource('DEFAULT_SMOOTHPANEASING'), 10); }
		if (Z.smoothPanGlide === null) { Z.smoothPanGlide = parseInt(this.getResource('DEFAULT_SMOOTHPANGLIDE'), 10); }
		if (Z.smoothZoom === null) { Z.smoothZoom = (this.getResource('DEFAULT_SMOOTHZOOM') != '0'); }
		if (Z.smoothZoomEasing === null) { Z.smoothZoomEasing = parseInt(this.getResource('DEFAULT_SMOOTHZOOMEASING'), 10); }

		if (Z.keys === null) { Z.keys = (this.getResource( 'DEFAULT_KEYS') != '0'); }
		if (Z.canvas === null) { Z.canvas = (this.getResource('DEFAULT_CANVAS') != '0'); }
		if (Z.baseZIndex === null) { Z.baseZIndex = parseInt(this.getResource('DEFAULT_BASEZINDEX'), 10); }
		if (Z.debug === null) { Z.debug = parseInt(this.getResource('DEFAULT_DEBUG'), 10); }

		if (Z.toolbarVisible === null) { Z.toolbarVisible = parseInt(this.getResource('DEFAULT_TOOLBARVISIBLE'), 10); }
		if (Z.toolbarBackgroundVisible === null) { Z.toolbarBackgroundVisible = parseInt(this.getResource('DEFAULT_TOOLBARBACKGROUNDVISIBLE'), 10); }
		if (Z.toolbarAutoShowHide === null) { Z.toolbarAutoShowHide = (Z.toolbarVisible != 0 && Z.toolbarVisible != 1 && Z.toolbarVisible != 6 && Z.toolbarVisible != 7 && Z.toolbarVisible != 8); }
		if (Z.toolbarPosition === null) { Z.toolbarPosition = parseFloat(this.getResource('DEFAULT_TOOLBARPOSITION')); }
		if (Z.logoVisible === null) { Z.logoVisible = (this.getResource('DEFAULT_LOGOVISIBLE') != '0'); }
		if (Z.logoCustomPath === null) { Z.logoCustomPath = this.getResource('DEFAULT_LOGOCUSTOMPATH'); }
		if (Z.minimizeVisible === null) { Z.minimizeVisible = (this.getResource('DEFAULT_MINIMIZEVISIBLE') != '0'); }
		if (Z.sliderZoomVisible === null) { Z.sliderZoomVisible = (this.getResource('DEFAULT_SLIDERZOOMVISIBLE') != '0'); }
		if (Z.mouseWheel === null) { Z.mouseWheel = parseInt(this.getResource('DEFAULT_MOUSEWHEEL'), 10); }

		if (Z.zoomButtonsVisible === null) { Z.zoomButtonsVisible = (this.getResource('DEFAULT_ZOOMBUTTONSVISIBLE') != '0'); }
		if (Z.panButtonsVisible === null) { Z.panButtonsVisible = (this.getResource('DEFAULT_PANBUTTONSVISIBLE') != '0'); }
		if (Z.resetVisible === null) { Z.resetVisible = (this.getResource('DEFAULT_RESETVISIBLE') != '0'); }
		if (Z.tooltipsVisible === null) { Z.tooltipsVisible = (this.getResource('DEFAULT_TOOLTIPSVISIBLE') != '0'); }

		if (Z.helpVisible === null) { Z.helpVisible = parseInt(this.getResource('DEFAULT_HELPVISIBLE'), 10); }
		if (Z.helpW === null) { Z.helpW = parseInt(this.getResource('UI_HELPDISPLAYWIDTH'), 10); }
		if (Z.helpH === null) { Z.helpH = parseInt(this.getResource('UI_HELPDISPLAYHEIGHT'), 10); }

		if (Z.progressVisible === null) { Z.progressVisible = (this.getResource('DEFAULT_PROGRESSVISIBLE') != '0'); }
		if (Z.messagesVisible === null) { Z.messagesVisible = (this.getResource('DEFAULT_MESSAGESVISIBLE') != '0'); }

		if (Z.fullViewVisible === null) { Z.fullViewVisible = (this.getResource('DEFAULT_FULLVIEWVISIBLE') != '0'); }
		if (Z.fullScreenVisible === null) { Z.fullScreenVisible  = (this.getResource('DEFAULT_FULLSCREENVISIBLE') != '0'); }
		if (Z.fullPageVisible === null) { Z.fullPageVisible = (this.getResource('DEFAULT_FULLPAGEVISIBLE') != '0'); }
		if (Z.initialFullPage === null) { Z.initialFullPage = (this.getResource('DEFAULT_INITIALFULLPAGE') != '0'); }

		if (Z.bookmarksGet === null) { Z.bookmarksGet = (this.getResource('DEFAULT_BOOKMARKSGET') != '0'); }
		if (Z.bookmarksSet === null) { Z.bookmarksSet = (this.getResource('DEFAULT_BOOKMARKSSET') != '0'); }

		if (Z.measureVisible !== true) { Z.measureVisible = (this.getResource('DEFAULT_MEASUREVISIBLE') != '0'); }
		if (Z.rotationVisible === null) { Z.rotationVisible = (this.getResource('DEFAULT_ROTATIONVISIBLE') != '0'); }
		if (Z.rotationFree === null) { Z.rotationFree = (this.getResource('DEFAULT_ROTATIONFREE') != '0'); }
		if (Z.initialR === null) { Z.initialR = this.getResource('DEFAULT_INITIALR'); }

		if (Z.screensaverSpeed === null && !isNaN(parseFloat(this.getResource('DEFAULT_SCREENSAVERSPEED')))) { Z.screensaverSpeed = parseFloat(this.getResource('DEFAULT_SCREENSAVERSPEED')); }

		if (Z.maskScale === null && !isNaN(parseFloat(this.getResource('DEFAULT_MASKSCALE')))) { Z.maskScale = parseFloat(this.getResource('DEFAULT_MASKSCALE')); }
		if (Z.maskFadeSpeed === null && !isNaN(parseFloat(this.getResource('DEFAULT_MASKFADESPEED')))) { Z.maskFadeSpeed = parseFloat(this.getResource('DEFAULT_MASKFADESPEED')); }
		if (Z.maskClearOnUserAction === null) { Z.maskClearOnUserAction = (this.getResource('DEFAULT_MASKCLEARONUSERACTION') != '0'); }

		if (Z.units === null) { Z.units = this.getResource('DEFAULT_UNITS'); }
		if (Z.sourceMagnification === null) { Z.sourceMagnification = parseInt(this.getResource('DEFAULT_SOURCEMAGNIFICATION'), 10); }

		if (Z.virtualPointerVisible === null) { Z.virtualPointerVisible = (this.getResource('DEFAULT_VIRTUALPOINTERVISIBLE') != '0'); }
		if (Z.virtualPointerPath === null) { Z.virtualPointerPath = this.getResource('DEFAULT_VIRTUALPOINTERPATH'); }
		if (Z.crosshairsVisible === null) { Z.crosshairsVisible = (this.getResource('DEFAULT_CROSSHAIRSVISIBLE') != '0'); }
		if (Z.zoomRectangle === null) { Z.zoomRectangle = (this.getResource('DEFAULT_ZOOMRECTANGLE') != '0'); }

		if (Z.rulerVisible === null) { Z.rulerVisible = parseInt(this.getResource('DEFAULT_RULERVISIBLE'), 10); }
		if (Z.rulerListType === null) { Z.rulerListType = this.getResource('DEFAULT_RULERLISTTYPE'); }
		if (Z.rulerW === null) { Z.rulerW = parseInt(this.getResource('DEFAULT_RULERWIDTH'), 10); }
		if (Z.rulerH === null) { Z.rulerH = parseInt(this.getResource('DEFAULT_RULERHEIGHT'), 10); }
		if (Z.rulerL === null) { Z.rulerL = parseInt(this.getResource('DEFAULT_RULERLEFT'), 10); }
		if (Z.rulerT === null) { Z.rulerT = parseInt(this.getResource('DEFAULT_RULERTOP'), 10); }

		if (!isNaN(parseFloat(this.getResource('DEFAULT_SLIDETRANSITIONSPEED')))) { Z.slideTransitionSpeed = parseFloat(this.getResource('DEFAULT_SLIDETRANSITIONSPEED')); }
		if (Z.slideButtonsVisible === null) { Z.slideButtonsVisible = (this.getResource('DEFAULT_SLIDEBUTTONSVISIBLE') != '0'); }

		if (Z.coordinatesVisible === null) { Z.coordinatesVisible = (this.getResource('DEFAULT_COORDINATESVISIBLE') != '0'); }

		if (Z.geoCoordinatesVisible === null) { Z.geoCoordinatesVisible = (this.getResource('DEFAULT_GEOCOORDINATESVISIBLE') != '0'); }

		if (Z.preloadVisible === null) { Z.preloadVisible = (this.getResource('DEFAULT_PRELOADVISIBLE') != '0'); }

		if (Z.focal === null) { Z.focal = parseInt(this.getResource('DEFAULT_FOCAL'), 10); }
		if (Z.quality === null) { Z.quality = parseInt(this.getResource('DEFAULT_QUALITY'), 10); }

		if (Z.magnifierVisible === null) { Z.magnifierVisible = (this.getResource('DEFAULT_MAGNIFIERVISIBLE') != '0'); }
		if (Z.magnifierW === null) { Z.magnifierW = parseInt(this.getResource('DEFAULT_MAGNIFIERWIDTH'), 10); }
		if (Z.magnifierH === null) { Z.magnifierH = parseInt(this.getResource('DEFAULT_MAGNIFIERHEIGHT'), 10); }
		if (Z.magnifierL === null) { Z.magnifierL = parseInt(this.getResource('DEFAULT_MAGNIFIERLEFT'), 10); }
		if (Z.magnifierT === null) { Z.magnifierT = parseInt(this.getResource('DEFAULT_MAGNIFIERTOP'), 10); }

		if (Z.narrativeFolderPath === null) { Z.narrativeFolderPath = Z.Utils.getResource('DEFAULT_NARRATIVEFOLDERPATH'); }
		if (Z.narrativeImageFolderPath === null) { Z.narrativeImageFolderPath = Z.Utils.getResource('DEFAULT_NARRATIVEIMAGEFOLDERPATH'); }
		if (Z.narrativeMediaFolderPath === null) { Z.narrativeMediaFolderPath = Z.Utils.getResource('DEFAULT_NARRATIVEMEDIAFOLDERPATH'); }
		if (Z.narrativeAnnotationFolderPath === null) { Z.narrativeAnnotationFolderPath = Z.Utils.getResource('DEFAULT_NARRATIVEANNOTATIONFOLDERPATH'); }

		if (Z.saveImageFull === null) { Z.saveImageFull = (this.getResource('DEFAULT_SAVEIMAGEFULL') != '0'); }
		if (Z.saveImageFilename === null) { Z.saveImageFilename = this.getResource('DEFAULT_SAVEIMAGEFILENAME'); }
		if (Z.saveImageFormat === null) { Z.saveImageFormat = this.getResource('DEFAULT_SAVEIMAGEFORMAT'); }
		if (Z.saveImageCompression === null) { Z.saveImageCompression = parseFloat(this.getResource('DEFAULT_SAVEIMAGECOMPRESSION')); }
		var dbS = null, dbsBGC = null, pcS = null, pcsBGC = null;
		var dB = document.body;
		if (dB) {
			dbS = document.body.style;
			dbsBGC = dbS.backgroundColor
		}
		var pageContainer = document.getElementById(Z.pageContainerID);
		if (pageContainer) {
			pcS = Z.Utils.getElementStyle(pageContainer);
			pcsBGC = pcS.backgroundColor
		}
		if (Z.saveImageBackColor === null) { Z.saveImageBackColor = (Z.Utils.stringValidate(pcsBGC) && pcsBGC != 'transparent') ? pcsBGC : (Z.Utils.stringValidate(dbsBGC) && dbsBGC != 'transparent') ? dbsBGC : Z.Utils.getResource('DEFAULT_SAVEIMAGEBACKCOLOR'); }

		if (Z.imageFilters === null) { Z.imageFilters = (this.getResource('DEFAULT_IMAGEFILTERS') != '0'); }
		if (Z.initialImageFilters === null) { Z.initialImageFilters = (this.getResource('DEFAULT_INITIALMAGEFILTERS') != '0'); }
		if (Z.brightnessVisible === null) { Z.brightnessVisible = (this.getResource('DEFAULT_BRIGHTNESSVISIBLE') != '0'); }
		if (Z.contrastVisible === null) { Z.contrastVisible = (this.getResource('DEFAULT_CONTRASTVISIBLE') != '0'); }
		if (Z.sharpnessVisible === null) { Z.sharpnessVisible = (this.getResource('DEFAULT_SHARPNESSVISIBLE') != '0'); }
		if (Z.blurrinessVisible === null) { Z.blurrinessVisible = (this.getResource('DEFAULT_BLURRINESSVISIBLE') != '0'); }
		if (Z.colorRedVisible === null) { Z.colorRedVisible = (this.getResource('DEFAULT_COLORREDVISIBLE') != '0'); }
		if (Z.colorGreenVisible === null) { Z.colorGreenVisible = (this.getResource('DEFAULT_COLORGREENVISIBLE') != '0'); }
		if (Z.colorBlueVisible === null) { Z.colorBlueVisible = (this.getResource('DEFAULT_COLORBLUEVISIBLE') != '0'); }
		if (Z.colorRedRangeVisible === null) { Z.colorRedRangeVisible = (this.getResource('DEFAULT_COLORREDRANGEVISIBLE') != '0'); }
		if (Z.colorGreenRangeVisible === null) { Z.colorGreenRangeVisible = (this.getResource('DEFAULT_COLORGREENRANGEVISIBLE') != '0'); }
		if (Z.colorBlueRangeVisible === null) { Z.colorBlueRangeVisible = (this.getResource('DEFAULT_COLORBLUERANGEVISIBLE') != '0'); }
		if (Z.gammaVisible === null) { Z.gammaVisible = (this.getResource('DEFAULT_GAMMAVISIBLE') != '0'); }
		if (Z.gammaRedVisible === null) { Z.gammaRedVisible = (this.getResource('DEFAULT_GAMMAREDVISIBLE') != '0'); }
		if (Z.gammaGreenVisible === null) { Z.gammaGreenVisible = (this.getResource('DEFAULT_GAMMAGREENVISIBLE') != '0'); }
		if (Z.gammaBlueVisible === null) { Z.gammaBlueVisible = (this.getResource('DEFAULT_GAMMABLUEVISIBLE') != '0'); }
		if (Z.hueVisible === null) { Z.hueVisible = (this.getResource('DEFAULT_HUEVISIBLE') != '0'); }
		if (Z.saturationVisible === null) { Z.saturationVisible = (this.getResource('DEFAULT_SATURATIONVISIBLE') != '0'); }
		if (Z.lightnessVisible === null) { Z.lightnessVisible = (this.getResource('DEFAULT_LIGHTNESSVISIBLE') != '0'); }
		if (Z.whiteBalanceVisible === null) { Z.whiteBalanceVisible = (this.getResource('DEFAULT_WHITEBALANCEVISIBLE') != '0'); }
		if (Z.normalizeVisible === null) { Z.normalizeVisible = (this.getResource('DEFAULT_NORMALIZEVISIBLE') != '0'); }
		if (Z.equalizeVisible === null) { Z.equalizeVisible = (this.getResource('DEFAULT_EQUALIZEVISIBLE') != '0'); }
		if (Z.noiseVisible === null) { Z.noiseVisible = (this.getResource('DEFAULT_NOISEVISIBLE') != '0'); }
		if (Z.grayscaleVisible === null) { Z.grayscaleVisible = (this.getResource('DEFAULT_GRAYSCALEVISIBLE') != '0'); }
		if (Z.thresholdVisible === null) { Z.thresholdVisible = (this.getResource('DEFAULT_THRESHOLDVISIBLE') != '0'); }
		if (Z.inversionVisible === null) { Z.inversionVisible = (this.getResource('DEFAULT_INVERSIONVISIBLE') != '0'); }
		if (Z.edgesVisible === null) { Z.edgesVisible = (this.getResource('DEFAULT_EDGESVISIBLE') != '0'); }
		if (Z.sepiaVisible === null) { Z.sepiaVisible = (this.getResource('DEFAULT_SEPIAVISIBLE') != '0'); }

		if (Z.fieldOfViewVisible === null) { Z.fieldOfViewVisible = (this.getResource('DEFAULT_FIELDOFVIEWVISIBLE') != '0'); }
		if (Z.textVisible === null) { Z.textVisible = (this.getResource('DEFAULT_TEXTVISIBLE') != '0'); }
		if (Z.shapeVisible === null) { Z.shapeVisible = (this.getResource('DEFAULT_SHAPEVISIBLE') != '0'); }
		
		if (Z.freehandVisible === null) { Z.freehandVisible = (this.getResource('DEFAULT_FREEHANDVISIBLE') != '0'); }
		if (Z.polygonVisible === null) { Z.polygonVisible = (this.getResource('DEFAULT_POLYGONVISIBLE') != '0'); }
		
		if (Z.annotationPanelVisible === null) { Z.annotationPanelVisible = parseInt(this.getResource('DEFAULT_ANNOTATIONPANELVISIBLE'), 10); }
		if (Z.labelShapesInternal === null) { Z.labelShapesInternal = (this.getResource('DEFAULT_LABELSHAPESINTERNAL') == '1'); }
		if (Z.annotationsAddMultiple === null) { Z.annotationsAddMultiple = (this.getResource('DEFAULT_ANNOTATIONSADDMULTIPLE') != '0'); }
		if (Z.annotationsAutoSave === null) { Z.annotationsAutoSave = (this.getResource('DEFAULT_ANNOTATIONSAUTOSAVE') != '0'); }
		if (Z.annotationsAutoSaveImage === null) { Z.annotationsAutoSaveImage = (this.getResource('DEFAULT_ANNOTATIONSAUTOSAVEIMAGE') != '0'); }
		if (Z.saveButtonVisible === null) { Z.saveButtonVisible = (this.getResource('DEFAULT_ANNOTATIONSAVEBUTTONVISIBLE') != '0'); }
		if (Z.labelClickSelect === null) { Z.labelClickSelect = (this.getResource('DEFAULT_LABELCLICKSELECT') != '0'); }
		if (Z.labelHighlight === null) { Z.labelHighlight = (this.getResource('DEFAULT_LABELHIGHLIGHT') != '0'); }

		if (Z.userPanelVisible === null) { Z.userPanelVisible = this.getResource('DEFAULT_USERPANELVISIBLE'); }
		if (Z.userNamePrompt === null) { Z.userNamePrompt = Z.Utils.getResource('UI_USERNAMEPROMPT'); }
		if (Z.userNamePromptRetry === null) { Z.userNamePromptRetry = Z.Utils.getResource('UI_USERNAMEPROMPTRETRY'); }

		if (Z.trackingPanelVisible === null) { Z.trackingPanelVisible = parseInt(this.getResource('DEFAULT_TRACKINGPANELVISIBLE'), 10); }
		if (Z.initialTrackingOverlayVisible === null) { Z.initialTrackingOverlayVisible = parseInt(this.getResource('DEFAULT_INITIALTRACKINGOVERLAYVISIBLE'), 10); }

		if (Z.sliderImageSetVisible === null) { Z.sliderImageSetVisible = (this.getResource('DEFAULT_IMAGESETSLIDERVISIBLE') != '0'); }

		if (typeof params === 'object' && params !== null) {
			var unrecognizedParamAlert = this.getResource('ERROR_UNRECOGNIZEDPARAMETERALERT');

			// Test for hotspot or annotation path and save handler path before allow setting of markup or annotation mode below.
			Z.annotationPathProvided = (typeof params['zHotspotPath'] !== 'undefined' || typeof params['zAnnotationPath'] !== 'undefined' || typeof params['zAnnotationXMLText'] !== 'undefined' || typeof params['zAnnotationJSONObject'] !== 'undefined' || typeof params['zNarrativePath'] !== 'undefined');	
			Z.saveHandlerProvided = (typeof params['zSaveHandlerPath'] !== 'undefined' || (typeof params['zNoPost'] !== 'undefined' && params['zNoPost'] == '1'));
			Z.fileHandlerProvided = (Z.saveHandlerProvided || typeof params['zFileHandlerPath'] !== 'undefined');
			Z.saveImageHandlerProvided = (typeof params['zFileHandlerPath'] !== 'undefined' || typeof params['zSaveImageHandlerPath'] !== 'undefined');
			Z.narrativePathProvided = (typeof params['zNarrativePath'] !== 'undefined');
			Z.imageSetPathProvided = (typeof params['zAnimationPath'] !== 'undefined' || typeof params['zSlidestackPath'] !== 'undefined');
			Z.mouseWheelParmeterProvided = (typeof params['zMouseWheel'] !== 'undefined');
			Z.trackingPathProvided = (typeof params['zTrackingPath'] !== 'undefined' || typeof params['zTrackingXMLText'] !== 'undefined' || typeof params['zTrackingJSONObject'] !== 'undefined');
			Z.userPathProvided = (typeof params['zUserPath'] !== 'undefined' || typeof params['zUserXMLText'] !== 'undefined' || typeof params['zUserJSONObject'] !== 'undefined');

			// Also test for slide path to enable test for impacts of Prototype.js library below.
			Z.slidePathProvided = ((Z.imagePath && Z.imagePath.indexOf('zSlidePath') != -1) || typeof params['zSlidePath'] !== 'undefined');
			var specialHandlingForPrototypeLib = (Z.slidePathProvided || Z.comparison || Z.overlays || Z.slideshow || Z.imageSetPathProvided || Z.animation || Z.slidestack);

			for (var pName in params) {

				// DEV NOTE: The Prototype.js library extends native data type prototypes and causes the for-in used to parse the optional parameters string
				// to fill the params object with extension functions that must be ignored. Exceptions added for Zoomify parameters that are functions.
				// Function test not effective when slide, animation, or slidestack path in use. Explicit name test then required.
				// String test may miss new prototype features so second condition below uses console rather than alert to avoid interruption of processing.
				if ((typeof params[pName] === 'function' && pName !== 'zOnAnnotationReady' && pName !== 'zOnReady')
					|| (specialHandlingForPrototypeLib && (pName == 'each' || pName == 'eachSlice' || pName == 'all' || pName == 'any' || pName == 'collect' || pName == 'detect' || pName == 'findAll' || pName == 'select' || pName == 'grep' || pName == 'include' || pName == 'member' || pName == 'inGroupsOf' || pName == 'inject' || pName == 'invoke' || pName == 'max' || pName == 'min' || pName == 'partition' || pName == 'pluck' || pName == 'reject' || pName == 'sortBy' || pName == 'toArray' || pName == 'zip' || pName == 'size' || pName == 'inspect' || pName == '_reverse' || pName == '_each' || pName == 'clear' || pName == 'first' || pName == 'last' || pName == 'compact' || pName == 'flatten' || pName == 'without' || pName == 'uniq' || pName == 'intersect' || pName == 'clone'))
					|| (pName.indexOf('this.indexOf') != -1)) {
						continue;

				} else if (typeof Z[Z.Utils.stringLowerCaseFirstLetter(pName.substr(1))] === 'undefined') {
					if (specialHandlingForPrototypeLib) {
						console.log(unrecognizedParamAlert + ' ' +pName);
					} else {
						alert(unrecognizedParamAlert + ' ' +pName);
					}

				} else {

					pValue = params[pName];

					// For limited feature edition, disable Express, Pro, and Enterprise parameters.
					// Then only one is supported, zNavigatorVisible, and Z logo link is enabled.
					if (!Z.expressParamsEnabled && pName != 'zNavigatorVisible') {
						alert(expressParamsDisabledAlert + ' ' +pName);

					} else {
						switch (pName) {

							case 'zOnAnnotationReady' : // Callback function option for completion of Annotation Panel initialization.
								if (typeof pValue === 'function') {
									Z.setCallback('annotationPanelInitializedViewer', pValue);
								}
								break;
							case 'zOnReady' : // Callback function option for completion of Viewer initialization.
								if (typeof pValue === 'function') {
									Z.setCallback('readyViewer', pValue);
								}
								break;

							case 'zInitialX' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { Z.initialX = parseFloat(pValue); }
								break;
							case 'zInitialY' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { Z.initialY = parseFloat(pValue); }
								break;
							case 'zInitialZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }
								if (!isNaN(parseFloat(pValue))) {
									Z.initialZ = parseFloat(pValue);
									if (Z.initialZ && Z.initialZ > 0 && Z.initialZ <= 100) { Z.initialZ /= 100; }
								}
								break;
							case 'zMinZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }
								if (!isNaN(parseFloat(pValue))) {
									Z.minZ = parseFloat(pValue);
									if (Z.minZ && Z.minZ > 0 && Z.minZ <= 100) { Z.minZ /= 100; }
								}
								break;
							case 'zMaxZoom' : // '1' to '100' recommended range (internally 0.1 to 1), default is 1 (100%).
								if (!isNaN(parseFloat(pValue))) {
									Z.maxZ = parseFloat(pValue);
									if (Z.maxZ && Z.maxZ != -1) { Z.maxZ /= 100; }
								}
								break;

							case 'zNavigatorVisible' :  // '0'=hide, '1'=show, '2'= initially show then hide on mouse-out (default), '3'=initially hide then show when mouse over.
								Z.navigatorVisible = parseInt(pValue, 10);
								break;
							case 'zNavigatorRectangleColor' :  // Valid web color, '#' character permitted but not required.
								Z.navigatorRectangleColor = pValue;
								break;

							case 'zToolbarInternal' :  // '0'=false (default), '1'=true, substitutes simple canvas-drawn toolbar with no need for external skin graphics files in Assets folder.
								Z.toolbarInternal = pValue;
								break;
							case 'zToolbarVisible' :  // '0'=hide, '1'=show, '2'= initially show then hide on mouse-out (default), '3'=initially hide then show when mouse over, '4' and '5'=same as '2' and '3' but minimize rather than hiding, '6' and '7'= same as '1' and '2' but minimize buttons still visible (and toolbar overlaps display), '8' hides toolbar and keeps it hidden (supports external toolbar with editing functions fully enabled). On mobile devices behavior is forced from '2' and '3' to '4' and '5'.
								Z.toolbarVisible = parseInt(pValue, 10);
								Z.toolbarAutoShowHide = (Z.toolbarVisible != 0 && Z.toolbarVisible != 1 && Z.toolbarVisible != 6 && Z.toolbarVisible != 7 && Z.toolbarVisible != 8);
								break;
							case 'zToolbarBackgroundVisible' :  // '0'=hide, '1'=show (default).
								if (pValue == '0') { Z.toolbarBackgroundVisible = false; }
								break;
							case 'zLogoVisible' :  // '0'=hide, '1'=show (default).
								if (pValue == '0') { Z.logoVisible = false; }
								break;
							case 'zMinimizeVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { Z.minimizeVisible = false; }
								break;
							case 'zSliderVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { Z.sliderZoomVisible = false; }
								break;
							case 'zZoomButtonsVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { Z.zoomButtonsVisible = false; }
								break;
							case 'zPanButtonsVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { Z.panButtonsVisible = false; }
								break;
							case 'zResetVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { Z.resetVisible = false; }
								break;

							case 'zFullViewVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '1') {
									Z.fullScreenVisible = true;
									Z.fullPageVisible = false;
								} else if (pValue == '0') {
									Z.fullScreenVisible = false;
									Z.fullPageVisible = false;
								}
								break;
							case 'zFullScreenVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') {
									Z.fullScreenVisible = false;
									Z.fullPageVisible = false;
								}
								break;
							case 'zFullPageVisible' :  // '0'=false (default), '1'=true.
								if (pValue == '1') {
									Z.fullScreenVisible = false;
									Z.fullPageVisible = true;
								}
								break;
							case 'zInitialFullPage' :  // '0'=false (default), '1'=true.
								if (pValue == '1') { Z.initialFullPage = true; }
								break;
							case 'zFullPageInitial' :  // Deprecated. Replaced with the above for consistency.
								alert(Z.Utils.getResource('ERROR_PARAMETERDEPRECATED') + ' zFullPageInitial is now zInitialFullPage');
								break;

							case 'zSkinPath' :
								Z.skinPath = pValue;
								break;
							case 'zTooltipsVisible' :  // '0'=hide, '1'=show (default).
								if (pValue == '0') { Z.tooltipsVisible = false; }
								break;

							case 'zHelpVisible' :  // '0'=hide, '1'=show (default), '2'=hide toolbar help, show annotation & markup help, '3'=reverse.
								Z.helpVisible = parseInt(pValue, 10);
								break;
							case 'zHelpPath' :
								Z.helpPath = pValue;
								Z.helpCustom = true;
								break;
							case 'zHelpWidth' : // Size in pixels, default is 430.
								if (!isNaN(parseInt(pValue, 10))) { Z.helpW = parseInt(pValue, 10); }
								break;
							case 'zHelpHeight' : // Size in pixels, default is 300.
								if (!isNaN(parseInt(pValue, 10))) { Z.helpH = parseInt(pValue, 10); }
								break;
							case 'zHelpLeft' : // Position in pixels, default is centered horizontally in display.
								if (!isNaN(parseInt(pValue, 10))) { Z.helpL = parseInt(pValue, 10); }
								break;
							case 'zHelpTop' : // Position in pixels, default is centered vertically in display.
								if (!isNaN(parseInt(pValue, 10))) { Z.helpT = parseInt(pValue, 10); }
								break;

							case 'zProgressVisible' :  // '0'=false, '1'=true (default).
								if (pValue == '0') { Z.progressVisible = false; }
								break;
							case 'zMessagesVisible' :  // '0'=hide, '1'=show (default).
								if (pValue == '0') { Z.messagesVisible = false; }
								break;

							case 'zTileSource' : 
								if (pValue.toLowerCase() == 'dzi') { Z.tileSource = 'DZIFolder'; }
								break;

							case 'zUsingDirectoryExtensions' :  // '0'=false (default), '1'=true.
								if (pValue == '1') { Z.usingDirectoryExtensions = true; }
								break;
						}
					}
				}
			}
		}

		Z.Utils.validateImagePath();
	},

	resetParametersXYZ : function (params) {
		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALX')))) { Z.initialX = parseFloat(this.getResource('DEFAULT_INITIALX')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALY')))) { Z.initialY = parseFloat(this.getResource('DEFAULT_INITIALY')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_INITIALZOOM')))) { Z.initialZ = parseFloat(this.getResource('DEFAULT_INITIALZOOM')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_MINZOOM')))) { Z.minZ = parseFloat(this.getResource('DEFAULT_MINZOOM')); }
		if (!isNaN(parseFloat(this.getResource('DEFAULT_MAXZOOM')))) { Z.maxZ = parseFloat(this.getResource('DEFAULT_MAXZOOM')); }

		if (this.stringValidate(params)) {
			for (var i = 0, j = params.length; i < j; i++) {
				var nameValuePair = params[i];
				var sep = nameValuePair.indexOf('=');
				if (sep > 0) {
					var pName = nameValuePair.substring(0, sep);
					var pValue = nameValuePair.substring(sep + 1);
					if (this.stringValidate(pValue)) {
						switch (pName) {
							case 'zInitialX' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { Z.initialX = parseFloat(pValue); }
								break;
							case 'zInitialY' : // Default is null (centered).
								if (!isNaN(parseFloat(pValue))) { Z.initialY = parseFloat(pValue); }
								break;
							case 'zInitialZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }
								if (!isNaN(parseFloat(pValue))) {
									Z.initialZ = parseFloat(pValue);
									if (Z.initialZ && Z.initialZ > 1) { Z.initialZ /= 100; }
								}
								break;
							case 'zMinZoom' : // '1' to '100' recommended range (internally 0.1 to 1). Special inputs are 'fit' (default, zoom-to-fit in view area) and 'fill' (zoom-to-fill view area). Input value of -1 for zoom-to-fit is deprecated.
								if (pValue == 'fit') { pValue = '-1'; }
								if (pValue == 'fill') { pValue = '0'; }
								if (!isNaN(parseFloat(pValue))) {
									Z.minZ = parseFloat(pValue);
									if (Z.minZ && Z.minZ > 1) { Z.minZ /= 100; }
								}
								break;
							case 'zMaxZoom' : // '1' to '100' recommended range (internally 0.1 to 1), default is 1 (100%).
								if (!isNaN(parseFloat(pValue))) {
									Z.maxZ = parseFloat(pValue);
									if (Z.maxZ && Z.maxZ > 1) { Z.maxZ /= 100; }
								}
								break;
						}
					}
				}
			}
		}
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

	// Process or disallow special paths for storage options.
	validateImagePath : function (imageSetPath) {		
		var imgPath = (typeof imageSetPath !== 'undefined' && Z.Utils.stringValidate(imageSetPath)) ? imageSetPath : Z.imagePath;
		if (imgPath !== null) {
			var specialStorageDisabledAlert = this.getResource('DEFAULT_SPECIALSTORAGESUPPORTDISABLEDALERT');

			if (imgPath.toLowerCase().indexOf('.zif') != -1 && !Z.requestTiles) {
				Z.imageFilename = imgPath.substring(imgPath.toLowerCase().lastIndexOf('/') + 1);
				if (Z.singleFileSupported) {
					Z.tileSource = 'ZoomifyZIFFile';
					Z.Utils.validateResponseArrayFunctionality();

					// Set callback to create Viewer when local image file selected.
					if (Z.localUse && Z.localFilesSupported && Z.localFile === null) {
						Z.setCallback('imageFileSelected', Z.createViewer);
						Z.Utils.validateLocalViewing();
					}

				} else {
					alert(this.getResource('ALERT_ZIFREQUIRESNEWERBROWSER'));
				}

			} else if (!Z.usingDirectoryExtensions && (imgPath.toLowerCase().indexOf('.jpg') != -1 || imgPath.toLowerCase().indexOf('.png') != -1)) {
				Z.tileSource = 'unconverted';

			} else if (imgPath.toLowerCase().indexOf('.pff') != -1 && !Z.requestTiles) {
				Z.imageFilename = imgPath.substring(imgPath.toLowerCase().lastIndexOf('/') + 1);
				if (Z.specialStorageEnabled || Z.singleFileSupported) { // Servlet or byte functions supported.
					Z.tileSource = 'ZoomifyPFFFile';
					Z.Utils.validateResponseArrayFunctionality();

					// Set callback to create Viewer when local image file selected.
					if (Z.localUse && Z.localFilesSupported && Z.localFile === null) {
						Z.setCallback('imageFileSelected', Z.createViewer);
						Z.Utils.validateLocalViewing();
					}

					if (Z.specialStorageEnabled && Z.tileHandlerPath !== null) {
						// Build full tile handler path.
						var tHPF = Z.tileHandlerPath;

						// DEV NOTE: JavaScript cross-domain block conflicts with specifying server IP and port.
						//if (tHPF.substr(0,1) != '/') { tHPF = '/' + tHPF; }
						//if (Z.serverPort != '80') { tHPF = ':' + Z.serverPort + tHPF; }
						//tHPF = Z.serverIP + tHPF;

						Z.tileHandlerPathFull = tHPF;
					}

				} else {
					if (!Z.singleFileSupported && Z.tileHandlerPath === null) {
						alert(this.getResource('ALERT_PFFREQUIRESNEWERBROWSER'));			
					} else if (!Z.specialStorageEnabled) {
						alert(specialStorageDisabledAlert);
					}
				}

			} else if (Z.Utils.stringValidate(Z.iiifServer)) {
				// IIIF server protocol implementation.
				Z.tileSource = 'IIIFImageServer';

				var scheme = (typeof Z.iiifScheme != 'undefined' && Z.Utils.stringValidate(Z.iiifScheme)) ? Z.iiifScheme + '://' : 'https' + '://';
				var server = (typeof Z.iiifServer != 'undefined' && Z.Utils.stringValidate(Z.iiifServer)) ? Z.iiifServer + '/' : null;
				var prefix = (typeof Z.iiifPrefix != 'undefined' && Z.Utils.stringValidate(Z.iiifPrefix)) ? Z.iiifPrefix + '/' : null;
				var identifier = (typeof Z.iiifIdentifier != 'undefined' && Z.Utils.stringValidate(Z.iiifIdentifier)) ? Z.iiifIdentifier : null;
				if (scheme && server && identifier) {
					Z.imagePath = scheme + server + prefix + identifier;
				} else {
					Z.imagePath = Z.Utils.getResource('ERROR_SETTINGIIIFIMAGEPATH');
				}
				
			} else if (Z.tileSource == 'DZIFolder' || imgPath.toLowerCase().indexOf('.dzi') != -1) {
				// Alternative method for supporting DZI folder.
				Z.tileSource = 'DZIFolder';
				var imgPathLower = imgPath.toLowerCase();

				var slashIndexLast = imgPath.lastIndexOf('/');
				if (slashIndexLast == -1) { // No slash so no properties filename so must create.
					slashIndexLast = 0;
					Z.dziImageSubfolder = imgPath;
					Z.dziImagePropertiesFilename = Z.dziImageSubfolder + '.dzi';

				} else {
					var slashIndexPrior = imgPath.substring(0, slashIndexLast).lastIndexOf('/');
					if (slashIndexPrior == -1) { slashIndexPrior = 0; }
					var tempFilenameLower = imgPathLower.substring(slashIndexLast + 1, imgPathLower.length);
					var extensionIndex = tempFilenameLower.indexOf('.dzi');
					if (extensionIndex != -1) { // Do not force lowercase for dzi property file name.
						Z.dziImagePropertiesFilename = imgPath.substring(slashIndexLast + 1, imgPathLower.length);
					} else { // Do force lowercase for xml property file name.
						Z.dziImagePropertiesFilename = imgPathLower.substring(slashIndexLast + 1, imgPathLower.length);
						extensionIndex = Z.dziImagePropertiesFilename.toLowerCase().indexOf('.xml');
					}
					Z.dziImageSubfolder = Z.dziImagePropertiesFilename.substring(0, extensionIndex) + '_files';
					Z.imagePath = imgPath.substring(0, slashIndexLast);
				}

			} else if (!Z.Utils.stringValidate(Z.tileHandlerPath)) {
				Z.tileSource = 'ZoomifyImageFolder';

			} else if (Z.Utils.stringValidate(Z.tileHandlerPath)) {
				if (Z.specialStorageEnabled) {
					 // Example image server protocol implementation.
					Z.tileSource = 'ImageServer';

					// Build full tile handler path.
					var tHPF = Z.tileHandlerPath;

					// DEV NOTE: JavaScript cross-domain block conflicts with specifying server IP and port.
					//if (tHPF.substr(0,1) != '/') { tHPF = '/' + tHPF; }
					//if (Z.serverPort != '80') { tHPF = ':' + Z.serverPort + tHPF; }
					//tHPF = Z.serverIP + tHPF;

					Z.tileHandlerPathFull = tHPF;

				} else {
					alert(specialStorageDisabledAlert);
				}
			}

		} else if (Z.imageSet || Z.slideshow) {
			Z.tileSourceMultiple = true;
		}
	},

	validateLocalViewing : function () {
		var containerDims = Z.Utils.getContainerSize(Z.pageContainer, Z.ViewerDisplay);
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
		Z.FileAccessDisplay = Z.Utils.createContainerElement('div', 'FileAccessDisplay', 'inline-block', 'relative', 'auto', faW + 'px', faH + 'px', faL + 'px', faT + 'px', 'solid', '1px', 'lightGrey', '0px', '0px', 'normal', null, true);
		Z.pageContainer.appendChild(Z.FileAccessDisplay);

		var titleTxt = Z.Utils.getResource('ALERT_VALIDATELOCALZIFVIEWING-TITLE');
		var titleBox = Z.Utils.createTextElement('titleBox', titleTxt, titleW + 'px', titleH + 'px', titleL + 'px', titleT + 'px', textPad + 'px', 'none', '0px', true, 'verdana', '13px', 'none', null, 1, 'hidden', 'hidden', null);
		Z.FileAccessDisplay.appendChild(titleBox);
		titleBox.firstChild.style.textAlign = 'center';
		titleBox.firstChild.style.fontWeight = 'bold';

		var messageTxt = Z.Utils.getResource('ALERT_VALIDATELOCALZIFVIEWING-MESSAGE') + Z.imageFilename;
		var messageBox = Z.Utils.createTextElement('messageBox', messageTxt, messageW + 'px', messageH + 'px', messageL + 'px', messageT + 'px', textPad + 'px', 'none', '0px', true, 'verdana', '13px', 'none', null, 1, 'hidden', 'hidden', null);
		Z.FileAccessDisplay.appendChild(messageBox);
		messageBox.firstChild.style.textAlign = 'center';

		var inputCont = Z.Utils.createContainerElement('div', 'inputCont', 'inline-block', 'relative', 'auto', btnContW + 'px', btnContH + 'px', btnContL + 'px', btnContT + 'px', 'none', '0px', 'lightGrey', '0px', '0px', 'normal', null, true);
		var fileBtn = document.createElement('input');
		fileBtn.setAttribute("type", "file");
		inputCont.appendChild(fileBtn);
		Z.FileAccessDisplay.appendChild(inputCont);
		Z.Utils.addEventListener(fileBtn, 'change', Z.Utils.handleFileSelect);
	},

	handleFileSelect : function (event) {
		Z.localFile = event.target.files[0];
		Z.useLocalFile = true;
		Z.FileAccessDisplay.style.display = 'none';
		Z.Utils.validateCallback('imageFileSelected');
	},

	clearImageParameters : function () {
		Z.imagePath = null;
		Z.imagePath2 = null;
		Z.imageMetadataXML = null;
		Z.parameters = null;
		Z.xmlParametersPath = null;
		Z.xmlParametersParsing = null;
		Z.initialX = null;
		Z.initialY = null;
		Z.initialZ = null;
		Z.minZ = null;
		Z.maxZ = null;
		Z.zoomAndPanInProgressID = null;
		Z.geoCoordinatesPath = null;
		Z.geoCoordinatesVisible = null;
		Z.geoCoordinatesFolder = null;
		Z.tour = false;
		Z.tourPath = null;
		Z.tourPlaying = null;
		Z.tourStop = false;
		Z.hotspots = false;
		Z.hotspotPath = null;
		Z.hotspotFolder = null;
		if (!Z.narrative) {
			Z.annotations = false;
			Z.annotationPath = null;
			Z.annotationPanelVisible = null;
			Z.clickURLEntryVisible = null;
			Z.annotationFolder = null;
			Z.annotationJSONObject = null;
			Z.annotationXMLText = null;
			Z.labelShapesInternal = null;
			Z.annotationsAddMultiple = null;
			Z.annotationsAutoSave = null;
			Z.annotationsAutoSaveImage = null;
		}

		Z.initialR = null;

		Z.unitsPerImage = null;
		Z.pixelsPerUnit = null;
		Z.sourceMagnification = null;
		Z.imageProperties = null;
		Z.annotationPathProvided = false;
		Z.slidePathProvided = false;
		Z.tileSource = null;
		Z.pffJPEGHeadersSeparate = false;
		Z.focal = null;
		Z.quality = null;

		Z.sliderFocus = 'zoom';
		Z.animation = false;
		Z.animationPath = null;
		Z.animationCount = 0;
		Z.animationAxis = null;
		Z.animator = null;
		Z.animationFlip = null;
		Z.slidestack = false;
		Z.slidestackPath = null;
		Z.imageSetHotspotPath = null;
		Z.hotspotFileShared = false;
		Z.imageSetAnnotationPath = null;
		Z.annotationFileShared = false;
		Z.imageW = null;
		Z.imageH = null;
		Z.imageD = null;
		Z.imageCtrX = null;
		Z.imageCtrY = null;
		Z.imageX = 0;
		Z.imageY = 0;
		Z.imageZ = 0;
		Z.imageR = 0;
		Z.fitZ = null;
		Z.fillZ = null;
		Z.zooming = 'stop';
		Z.panningX = 'stop';
		Z.panningY = 'stop';
		Z.rotating = 'stop';

		Z.postingXML = false;
		Z.postingHTML = false;
		Z.postingImage = false;
		Z.postingFile = false;

		Z.iiifInfoJSONObject =null;
		Z.iiifIdentifier = null;
		Z.iiifRegion = null;
		Z.iiifSize = null;
		Z.iiifRotation = null;
		Z.iiifQuality = null;
		Z.iiifFormat = null;
		
		maxTier = 0;
		maxTileR = 0;
		maxTileB = 0;
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
				resTxt = '4';
				break;
			case 'DEFAULT_MOUSECLICKTHRESHOLDTIMEVIEWPORT' :
				resTxt = '500';
				break;
			case 'DEFAULT_MOUSECLICKTHRESHOLDHOTSPOT' :
				resTxt = '4';
				break;
			case 'DEFAULT_TOUCHTAPTHRESHOLDVIEWPORT' :
				resTxt = (!Z.mobileDevice) ? '6' : '8';
				break;
			case 'DEFAULT_TOUCHTAPTHRESHOLDTIMEVIEWPORT' :
				resTxt = '500';
				break;
			case 'DEFAULT_MOUSECLICKTHRESHOLDNAVIGATOR' :
				resTxt = '4';
				break;
			case 'DEFAULT_TOUCHTAPTHRESHOLDNAVIGATOR' :
				resTxt = (!Z.mobileDevice) ? '3' : '6';
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

	clearComponent : function (component) {
		switch (component) {
			case Z.Toolbar :
				Z.Toolbar = null;
				Z.Utils.clearDisplay(Z.ToolbarDisplay);
				Z.toolbarVisible = null;
				Z.toolbarBackgroundVisible = null;
				Z.skinPath = null;
				Z.sliderZoomVisible = null;
				Z.logoVisible = null;
				Z.minimizeVisible = null;
				Z.zoomButtonsVisible = null;
				Z.sliderVisible = null;
				Z.panButtonsVisible = null;
				Z.resetVisible = null;
				Z.fullScreenVisible = null;
				Z.tooltipsVisible = null;
				Z.helpVisible = null;
				Z.progressVisible = null;
				break;
			case Z.Navigator :
				Z.navigatorVisible = null;
				Z.navigatorW = null;
				Z.navigatorH = null;
				Z.navigatorL = null;
				Z.navigatorT = null;
				Z.navigatorFit = null;
				Z.navigatorRectangleColor = null;
				break;
			case Z.Gallery :
				Z.Utils.clearDisplay(Z.GalleryDisplay);
				Z.Gallery = null;
				Z.galleryVisible = null;
				Z.galleryAutoShowHide = null;
				Z.galleryW = null;
				Z.galleryH = null;
				Z.galleryM = null;
				Z.galleryL = null;
				Z.galleryT = null;
				Z.galleryPosition = null;
				Z.galleryRectangleColor = null;
				break;
			case Z.Ruler :
				Z.Utils.clearDisplay(Z.RulerDisplay);
				Z.Ruler = null;
				Z.rulerVisible = null;
				Z.rulerListType = null;
				Z.rulerW = null;
				Z.rulerH = null;
				Z.rulerL = null;
				Z.rulerT = null;
				break;
		}
	},

	clearDisplay : function (display) {
		// Completely clear viewport or other display including prior tiles better than backfill. Subsequent
		// redraw of new tiles will leave gaps with backfill showing rather than tiles from prior view.
		if (display) {
			if (Z.useCanvas && display.tagName == 'CANVAS') {
				Z.Utils.clearCanvas(display);
			} else {
				while (display.hasChildNodes()) {
				 	display.removeChild(display.lastChild);
				}
			}
		}
	},

	clearCanvas : function (canvas) {		
		var ctx = canvas.getContext('2d');
		ctx.save();
		// Trap possible NS_ERROR_FAILURE error especially in firefox especially if working with large unconverted image.
		// DEV NOTE: Add retry or soft fail in catch in future implementation for firefox issue with large canvases.
		try {
			ctx.setTransform(1,0,0,1,0,0);
		} catch (e) {
			Z.Utils.showMessage(Z.Utils.getResource('ERROR_SETTINGTRANSFORMONCANVASFORUNCONVERTEDIMAGE'));
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

	deleteDiv : function (divID) {
		var targetDiv = document.getElementById(divID);
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

	// Determine if callback is set.
	verifyCallback : function (callbackEvent) {
		var callbackValidated = false;
		if (typeof Z.callbacks !== 'undefined') {
			var callbacksTempArr = Z.callbacks.slice(0);
			for (var i = 0, j = callbacksTempArr.length; i < j; i++) {
				var callback = callbacksTempArr[i];
				if (callback && callback.callbackEvent == callbackEvent && typeof callback === 'object' && typeof callback.callbackFunction === 'function') {
					callbackValidated = true;
				}
			}
		}
		return callbackValidated;
	},

	// Determine if callback is set.
	getCallbackFunction : function (callbackEvent) {
		var callbackFunction = null;
		if (typeof Z.callbacks !== 'undefined') {
			var callbacksTempArr = Z.callbacks.slice(0);
			for (var i = 0, j = callbacksTempArr.length; i < j; i++) {
				var callback = callbacksTempArr[i];
				if (callback && callback.callbackEvent == callbackEvent && typeof callback === 'object' && typeof callback.callbackFunction === 'function') {
					callbackFunction = callback.callbackFunction;
				}
			}
		}
		return callbackFunction;
	},

	// Timer permits completion of callback-related events such as mouseup during updateView.
	// Passing in array ensures multiple callbacks on same event will not be interfered with by clearCallback calls of any.
	validateCallback : function (callbackName) {
		if (typeof Z.callbacks === 'undefined') { Z.callbacks = []; }
		var callbacksTempCopy = Z.callbacks.slice(0);		
		Z.Utils.functionCallWithDelay(function () { Z.Utils.validateCallbackDelayed(callbackName, callbacksTempCopy); }, 10);
	},

	// For loop enables more than one function call to be assigned to a callback event.
	validateCallbackDelayed : function (callbackName, callbacksTempArr) {
		
		for (var i = 0, j = callbacksTempArr.length; i < j; i++) {
			var callback = callbacksTempArr[i];

			// DEV NOTE: First condition needed due to asynchronous callbacks array deletions.
			if (callback && callback.callbackName == callbackName && typeof callback === 'object' && typeof callback.callbackFunction === 'function') {
				switch (callbackName) {
					case 'viewChanging' :
						callback.callbackFunction();
						break;
					case 'viewPanningGetCurrentCoordinates' :
						var currCoords = Z.Viewport.getCoordinates();
						callback.callbackFunction(currCoords);
						break;
					case 'viewZoomingGetCurrentZoom' :
						var currentZ = Z.Viewport.getZoom();
						callback.callbackFunction(currentZ);
						break;
					case 'viewChangingGetCurrentCoordinatesFull' :
						var currCoordsFull = Z.Viewport.getCoordinatesFull();
						callback.callbackFunction(currCoordsFull);
						break;
					case 'viewUpdateCompleteGetLabelIDs' :
						var labelIDsInView = Z.Viewport.getLabelIDsInCurrentView(false, true, true);
						callback.callbackFunction(labelIDsInView);
						break;
					case 'viewUpdateCompleteGetLabelInternalIDs' :
						var labelInternalIDsInView = Z.Viewport.getLabelIDsInCurrentView(true, true, true);
						callback.callbackFunction(labelInternalIDsInView);
						break;
					case 'labelSavedGetJSONObject' :
						var labelCurr = Z.Viewport.getCurrentLabel();
						if (labelCurr) {
							var labelIDCurrent = labelCurr.internalID;
							var jsonLabelObject = Z.Viewport.getLabelJSONObject(labelIDCurrent, true);
							callback.callbackFunction(jsonLabelObject);
						}
						break;
					case 'labelCreatedGetInternalID' :
						if (Z.Viewport && Z.Viewport.getStatus('XMLParsedViewport')) {
							var labelCurr = Z.Viewport.getCurrentLabel();
							if (labelCurr) {
								var labelIDCurrent = labelCurr.internalID;
								callback.callbackFunction(labelIDCurrent);
							}
						}
						break;						
					case 'labelDrawnGetIDs' :
						if (Z.Viewport) {
							var labelCurr = Z.Viewport.getCurrentLabel();
							if (labelCurr) {
								callback.callbackFunction(labelCurr.id, labelCurr.internalID);
							}						
						}
						break;		
					case 'labelSelectedInViewportGetIDs' :
						if (Z.Viewport) {
							var labelCurr = Z.Viewport.getCurrentLabel();
							if (labelCurr) {
								callback.callbackFunction(labelCurr.id, labelCurr.internalID);
							}
						}
						break;
					case 'currentLabelChangedGetID' :
						if (Z.Viewport) {
							var labelCurr = Z.Viewport.getCurrentLabel();
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

	createContainerElement : function (tagName, id, display, position, overflow, width, height, left, top, borderStyle, borderWidth, background, margin, padding, whiteSpace, cursor, preventSelect, borderColor) {
		var emptyContainer = document.createElement(tagName);
		if (this.stringValidate(id)) { emptyContainer.id = id; }
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
 		ecS.background = (this.stringValidate(background)) ? background : 'transparent';
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

	createCenteredElement : function (elmt, id) {
		// Note that id is assigned to inner centered container not to embedded text node. To access use
		// firstChild, for example: var textNode = document.getElementById('myTextNode').firstChild;
		var div = this.createContainerElement('div');
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

	createTextElement : function (id, value, width, height, left, top, padding, border, borderWidth, readOnly, fontFamily, fontSize, resize, columns, rows, overflowX, overflowY, wrap) {
		var textBox = Z.Utils.createContainerElement('div', 'textBoxFor-' + id, 'inline-block', 'absolute', 'hidden', width, height, left, top, border, borderWidth, 'white', '0px', padding, 'normal');
		var textArea = document.createElement('textarea');
		textBox.appendChild(textArea);
		var ntA = textArea;
		var ntaS = ntA.style;
		ntA.id = id;
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
			ntA.wrap = ('off') ? 'soft' : wrap;
			// DEV NOTE: Alternative implementation - may require overlow='auto' and/or whiteSpace='pre'.
			if (wrap == 'off') { ntaS.whiteSpace = 'nowrap'; }
		}

		return textBox;
	},

	createSelectElement : function (listID, listTitle, dataProvider, listW, listX, listY, fontSize, visible, handler, handlerType, size) {
		// Create list.
		var sList = document.createElement('select');
		sList.id = listID;
		if (Z.Utils.stringValidate(listTitle) && listTitle != 'none') { sList.options[0] = new Option(listTitle, null); } // First option, set without value.
		for (var i = 0, j = dataProvider.length; i < j; i++) {
			sList.options[sList.options.length] = new Option(dataProvider[i].text, dataProvider[i].value);
		}

		// Assigning handler to mousedown event allows handler to set selected element to null and then assign change handler which
		// enables reselection of current element in list which would otherwise not trigger a change event. Alternative is to assign handler
		// to onchange event. Additional note: if no need to remove handler, direct assignment is possible as follows: sList.onchange = handler;
		var hType = (typeof handlerType !== 'undefined' && handlerType !== null) ? handlerType : 'change';
		Z.Utils.addEventListener(sList, hType, handler);
		
		// Set list length.		
		sList.size = size;

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
				var indexID = Z.Utils.arrayIndexOfObjectValue(dataProvider, 'value', selID);
				if (indexID != -1) { index = indexID; }
			}
			var indexLast = listObject.options.length - 1;
			listObject.selectedIndex = (index <= indexLast) ? index : indexLast;
		}
	},

	createInputElement : function (inputID, uploadFolderPath, visible, fileTypes, multiple, listType) {
		var inputBtn = document.createElement('input');
		inputBtn.id = inputID;
		inputBtn.type = 'file';
		inputBtn.accept = fileTypes;
		inputBtn.multiple = multiple;
		inputBtn.style.visibility = visible;
		Z.Utils.addEventListener(inputBtn, 'change', function () { Z.Narrative.uploadFiles(uploadFolderPath, this.files, listType); });

		// Alternative implementation: Add parameters for positioning if not hidden.

		return inputBtn;
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
			this.showMessage(this.getResource('ERROR_UNKNOWNELEMENTSTYLE'));
		}
	},

	getElementStyleProperty : function (elmt, styleProp) {
		if (window.getComputedStyle) {
			return window.getComputedStyle(elmt, null).getPropertyValue(styleProp);
		} else if (elmt.currentStyle) {
			return elmt.currentStyle[styleProp];
		} else {
			this.showMessage(this.getResource('ERROR_UNKNOWNELEMENTSTYLE'));
		}
	},

	getElementStylePropertyZIndex : function (elmt) {
		var zIndex = 0;
		if (window.document.defaultView.getComputedStyle) {
			zIndex = window.document.defaultView.getComputedStyle(elmt, null).getPropertyValue('z-index');
		} else if (elmt.currentStyle) {
			zIndex = elmt.currentStyle['z-index'];
		} else {
			this.showMessage(this.getResource('ERROR_UNKNOWNELEMENTSTYLE'));
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
			// DEV NOTE: Error reported on Sony Z3. Investigating.
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
			this.showMessage(this.getResource('ERROR_UNKNOWNMOUSESCROLL'));
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
			this.showMessage(this.getResource('ERROR_UNKNOWNWINDOWSIZE'));
		}
		return new this.Point(x, y);
	},

	Button : function (id, label, graphicPath, graphicUp, graphicOver, graphicDown, w, h, x, y, btnEvnt, btnEvntHndlr, tooltipResource, borderStyle, borderWidth, background, margin, padding, whiteSpace, cursor) {
		var button = Z.Utils.createContainerElement('span', id, 'inline-block', 'absolute', 'hidden', w, h, x, y, borderStyle, borderWidth, background, margin, padding, whiteSpace, cursor);

		if (!(Z.Utils.stringValidate(label))) {
			// Load images for each button state.
			graphicPath = Z.Utils.stringRemoveTrailingSlash(graphicPath);
			var imgUp = Z.Utils.createGraphicElement(graphicPath + '/' + graphicUp);
			var imgOver = Z.Utils.createGraphicElement(graphicPath + '/' + graphicOver);
			var imgDown = Z.Utils.createGraphicElement(graphicPath + '/' + graphicDown);

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
			button.appendChild(Z.Utils.createCenteredElement(textNode));
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
		if (Z.tooltipsVisible && Z.Utils.stringValidate(tooltipResource)) { button.title = Z.Utils.getResource(tooltipResource); }

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

	setButtonDefaults : function (targetBtn) {
		if (Z.Toolbar) {
			Z.Utils.clearButtonSettings(targetBtn);
			Z.Utils.setButtonState(targetBtn, 'up');
			Z.Utils.setButtonHandler(targetBtn, 'mouseover', Z.Toolbar.buttonEventsHandler);
		}
	},


	clearButtonSettings : function (targetBtn) {
		var iU = targetBtn.firstChild;
		var iO = targetBtn.childNodes[1];
		var iD = targetBtn.childNodes[2];
		if (iU && iO && iD) {
			iU.style.visibility = iO.style.visibility = iD.style.visibility = 'hidden';
			Z.Utils.removeEventListener(iU, 'mouseover', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(iO, 'mousedown', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(iO, 'mouseout', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(iD, 'mouseup', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(targetBtn, 'touchstart', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(targetBtn, 'touchend', Z.Toolbar.buttonEventsHandler);
			Z.Utils.removeEventListener(targetBtn, 'touchcancel', Z.Toolbar.buttonEventsHandler);
		}
		Z.Utils.removeEventListener(targetBtn, 'mouseover', Z.Toolbar.buttonEventsHandler);
		Z.Utils.removeEventListener(targetBtn, 'mousedown', Z.Toolbar.buttonEventsHandler);
		Z.Utils.removeEventListener(targetBtn, 'mouseout', Z.Toolbar.buttonEventsHandler);
		Z.Utils.removeEventListener(targetBtn, 'mouseup', Z.Toolbar.buttonEventsHandler);
	},

	setButtonState : function (targetBtn, state) {
		var graphic = (state == 'up') ? targetBtn.firstChild : (state == 'down') ? targetBtn.childNodes[1] : targetBtn.childNodes[2];
		if (graphic) { graphic.style.visibility = 'visible'; }
	},

	setButtonHandler : function (target, btnEvnt, btnEvntHndlr) {
		// Allow for button with graphics or label, context as pc or mobile device, and event up, over, or down state relevant.

		var targetEventHandler = (btnEvntHndlr !== 'undefined') ? btnEvntHndlr : Z.Toolbar.buttonEventsHandler;
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
		//Z.Utils.addEventListener(target, targetEvent, targetEventHandler);
		Z.Utils.addEventListener(target, touchEvent, targetEventHandler);
		Z.Utils.addEventListener(target, mouseEvent, targetEventHandler);
	},

	Checkbox : function (id, value, w, h, x, y, checkEvnt, checkEvntHndlr, tooltipResource) {
		// Container serves as workaround for checkbox and form sizing and positioning problems.
		var containerBox = Z.Utils.createContainerElement('div', 'containerFor-' + id, 'inline-block', 'absolute', 'hidden', w, h, x, y, 'none', '0px', 'transparent', '0px', '0px', 'normal');
		var checkbox = document.createElement('input');
		containerBox.appendChild(checkbox);
		checkbox.type = 'checkbox';
		checkbox.id = id;
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
		if (Z.tooltipsVisible && Z.Utils.stringValidate(tooltipResource)) { checkbox.title = Z.Utils.getResource(tooltipResource); }

		return containerBox;
	},

	Graphic : function (id, graphicPath, graphic, w, h, x, y, altResource) {
		// Load image for graphic.
		graphicPath = Z.Utils.stringRemoveTrailingSlash(graphicPath);
		var graphicPathFull = (graphic) ? graphicPath + '/' + graphic : graphicPath;
		var img = Z.Utils.createGraphicElement(graphicPathFull);
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
		var graphic = Z.Utils.createContainerElement('span', id, 'inline-block', 'absolute', 'hidden', w, h, x, y, 'none', '0px', 'transparent', '0px', '0px', 'normal');
		graphic.appendChild(img);
		this.elmt = graphic;

		// Prevent graphic dragging and disable context menu.
		Z.Utils.addEventListener(img, 'mousedown', Z.Utils.preventDefault);
		Z.Utils.addEventListener(img, 'touchstart', Z.Utils.preventDefault);
		Z.Utils.addEventListener(img, 'contextmenu', Z.Utils.preventDefault);
	},

	createGraphicElement : function (imageSrc) {
		var gImg = this.createContainerElement('img');
		var gElmt = null;
		if (Z.browser == Z.browsers.IE && Z.browserVersion < 7) {
			gElmt = this.createContainerElement('span', null, 'inline-block');
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

	Radiobutton : function (id, name, value, w, h, x, y, radioEvnt, radioEvntHndlr, tooltipResource) {
		// Container serves as workaround for radio button sizing and positioning.
		var containerBox = Z.Utils.createContainerElement('div', 'containerFor-' + id, 'inline-block', 'absolute', 'hidden', w, h, x, y, 'none', '0px', 'transparent', '0px', '0px', 'normal');
		var radioButton = document.createElement('input');
		containerBox.appendChild(radioButton);
		radioButton.type = 'radio';
		radioButton.id = id;
		radioButton.name = name;
		radioButton.value = value;
		radioButton.width = w;
		radioButton.height = h;
		var cS = containerBox.style;
		cS.width = w + 'px';
		cS.height = h + 'px';
		cS.left = x + 'px';
		cS.top = y + 'px';

		// Set event handler and element reference - the handler must support mouse and touch contexts.
		if (radioEvnt !== null && radioEvntHndlr !== null) {
			Z.Utils.addEventListener(radioButton, radioEvnt, radioEvntHndlr);
			Z.Utils.addEventListener(radioButton, 'radioEvnt', radioEvntHndlr);
		}

		// Set tooltip visibility per optional parameter.
		if (Z.tooltipsVisible && Z.Utils.stringValidate(tooltipResource)) { radioButton.title = Z.Utils.getResource(tooltipResource); }

		return containerBox;
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
	swapZIndices : function (element1, element2) {
		var zIndex1 = Z.Utils.getElementStylePropertyZIndex(element1);
		var zIndex2 = Z.Utils.getElementStylePropertyZIndex(element2);
		if (zIndex1 == 'auto' || zIndex2 == 'auto') {
			zIndex1 = (Z.baseZIndex - 101).toString();
			zIndex2 = (Z.baseZIndex - 100).toString();
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

	stringEscapeSpaces : function (stringToModify) {
		var regularExpression = new RegExp('_', "g");
		var modifiedString = stringToModify.replace(regularExpression, '__');
		regularExpression = new RegExp(' ', "g");
		modifiedString = modifiedString.replace(regularExpression, '_');
		return modifiedString;
	},

	stringUnescapeSpaces : function (stringToModify) {
		var regularExpression = new RegExp('__', "g");
		var modifiedString = stringToModify.replace(regularExpression, '_');
		regularExpression = new RegExp('_', "g");
		modifiedString = modifiedString.replace(regularExpression, ' ');
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

	stringGetRelativePath : function (rootFolder, targetPath) {
		var relativePath = rootFolder;
			if (rootFolder && targetPath) {
			var depthCount = (rootFolder.slice(0,1) == '/') ? 0 : rootFolder.split('/').length - 1;
			var upToWebPage = Z.Utils.stringMultiply('../', depthCount);
			relativePath = upToWebPage + targetPath;
		}
		return relativePath;
	},

	stringLowerCaseFirstLetter : function (str) {
		return str.charAt(0).toLowerCase() + str.slice(1);
	},

	stringUpperCaseFirstLetter : function (str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
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

	stringValidateTrailingSlashCharacter : function (stringToValidate) {
		if (typeof stringToValidate !== 'undefined' || stringToValidate !== null) {
			if (stringToValidate[stringToValidate.length - 1] != '/') {
				stringToValidate = stringToValidate + '/';
			}
		}
		return stringToValidate;
	},

	stringRemoveTrailingSlash : function (stringToClean) {
		var stringCleaned = (typeof stringToClean === 'undefined' || stringToClean === null) ? '' : (stringToClean.slice(-1, stringToClean.length) == '/') ? stringToClean.slice(0, stringToClean.length - 1) : stringToClean;
		// Next line removed to allow for leading slash signifying root context.
		//stringCleaned = (stringToClean.slice(0, 1) == '/') ? stringToClean.slice(1, stringToClean.length) : stringToClean;
		return stringCleaned;
	},

	stringRemoveTrailingSpace : function (stringToClean) {
		var stringCleaned = (typeof stringToClean === 'undefined' || stringToClean === null) ? '' : (stringToClean.slice(-1, stringToClean.length) == ' ') ? stringToClean.slice(0, stringToClean.length - 1) : stringToClean;
		return stringCleaned;
	},

	// Removes space before nestingString (usually a closing HTML/XML tag);
	stringRemoveNestedSpace : function (stringToClean, nestingString) {
		var stringCleaned = stringToClean;
		if (typeof stringToClean !== 'undefined' && Z.Utils.stringValidate(stringToClean)) {
			var spaceIndex = stringToClean.indexOf(nestingString);
			if (stringToClean.substring(spaceIndex - 1, spaceIndex) == ' ') {
				stringCleaned = stringToClean.slice(0, spaceIndex - 1) + stringToClean.slice(spaceIndex);
			}
		}
		return stringCleaned;
	},

	// Removes first instance only.
	stringRemoveNestedString : function (stringToClean, nestedString) {
		var stringCleaned = stringToClean;
		if (typeof stringToClean !== 'undefined' && Z.Utils.stringValidate(stringToClean)) {
			var removeBegin = stringToClean.indexOf(nestedString);
			var removeEnd = removeBegin + nestedString.length;
			stringCleaned = stringToClean.slice(0, removeBegin) + stringClean.slice(removeEnd);
		}
		return stringCleaned;
	},

	stringValidateURLScheme : function (urlToValidate) {
		if (typeof urlToValidate !== 'undefined' && urlToValidate !== null && urlToValidate.slice(0, 3) == 'www') {
			urlToValidate = 'http://' + urlToValidate;
		}
		return urlToValidate;
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
		if (!Z.Utils.stringValidate(value)) {
			value = '#000000';
		} else if (value.indexOf('#') != 0) {
			value = '#' + value;
		}
		var valueValid = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(value);
		if (!valueValid) { value = '#000000'; }
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
	//:::::::::::::::::::::::::::::::::: HTML UTILITY FUNCTIONS :::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	htmlGetSelection : function () {
		var html = '';
		if (typeof window.getSelection != 'undefined') {
			var sel = window.getSelection();
			if (sel.rangeCount) {
				var container = document.createElement('div');
				for (var i = 0, j = sel.rangeCount; i < j; ++i) {
					container.appendChild(sel.getRangeAt(i).cloneContents());
				}
				html = container.innerHTML;
			}
		} else if (typeof document.selection != 'undefined') {
			if (document.selection.type == 'Text') {
				html = document.selection.createRange().htmlText;
			}
		}
		return html;
	},

	htmlHighlightSelection : function (selectionStr) {
		Z.Utils.htmlReplaceSelection(Z.Utils.getResource('DEFAULT_NARRATIVEHIGHLIGHTSTART') + selectionStr + Z.Utils.getResource('DEFAULT_NARRATIVEHIGHLIGHTEND'));
	},

	htmlClearHighlight : function (htmlStr) {
		if (htmlStr) {
			htmlStr = htmlStr.replace(Z.Utils.getResource('DEFAULT_NARRATIVEHIGHLIGHTSTART'), '')
				.replace(Z.Utils.getResource('DEFAULT_NARRATIVEHIGHLIGHTEND'), '');
		}
		return htmlStr;
	},

	htmlCreateURLLink : function (htmlStr, selectionIndex, selectionStr, urlVal) {
		if (htmlStr) {
			// Set link.
			selectionStr = Z.Utils.stringRemoveTrailingSpace(selectionStr);
			urlVal = Z.Utils.stringValidateURLScheme(urlVal);
			var linkedStr = '<a href="' + urlVal + '" target="_blank" >' + selectionStr + '</a>';
			htmlStr = htmlStr.substring(0, selectionIndex) + linkedStr + htmlStr.substring(selectionIndex + selectionStr.length);
		}
		return htmlStr;
	},

	// Clear any link of any type. Any prior link is cleared in calling function due to different error handler conditions.
	htmlClearLinkFromSelection : function () {	
		var selectionStr = Z.Utils.htmlGetSelection();
		if (Z.Utils.stringValidate(selectionStr)) {
			var begin = null;
			if (selectionStr.indexOf('.zif\');\">') != -1) {
				begin = selectionStr.indexOf('zif\');\">') + 8; // Image link.
			} else if (selectionStr.indexOf('_blank\">') != -1) {
				begin = selectionStr.indexOf('_blank\">') + 8; // Media or URL link.
			} else if (selectionStr.indexOf('clearLabelHighlightsAll(true)\">') != -1) {
				begin = selectionStr.indexOf('clearLabelHighlightsAll(true)\">') + 23; // Label link.
			}
			if (begin) {
				var end = selectionStr.indexOf('</a>');
				Z.Utils.htmlReplaceSelection(selectionStr.substring(begin, end));
			}
		}
	},

	htmlReplaceSelection : function (htmlStr) {
		if (htmlStr) {
			var range;
			if (window.getSelection && window.getSelection().getRangeAt) {
				range = window.getSelection().getRangeAt(0);
				range.deleteContents();
				var div = document.createElement('div');
				div.innerHTML = htmlStr;
				var frag = document.createDocumentFragment(), child;
				while ((child = div.firstChild)) {
					frag.appendChild(child);
				}
				range.insertNode(frag);
			} else if (document.selection && document.selection.createRange) {
				range = document.selection.createRange();
				range.pasteHTML(htmlStr);
			}
		}
	},

	htmlClearSelection : function () {
		if ( document.selection ) {
			document.selection.empty();
		} else if ( window.getSelection ) {
			window.getSelection().removeAllRanges();
		}
	},

	htmlGetSelectionParagraphNode : function () {
		var paragraphNode = null;
		var selection = (window.getSelection) ? window.getSelection() : (document.selection) ? document.selection.createRange() : null;
		if (selection) {
			var parent = selection.anchorNode;
			while (parent != null && parent.localName != 'p' && parent.localName != 'P') {
				parent = parent.parentNode;
			}
			if (parent) { paragraphNode = parent; }
		}
		return paragraphNode;
	},

	htmlGetSelectionParagraphText : function () {
		var returnVal = '';
		var paragraphNode = Z.Utils.htmlGetSelectionParagraphNode();
		if (paragraphNode) { returnVal = parent.innerText || parent.textContent; }
		return returnVal;
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
				this.showMessage(e.name + this.getResource('ERROR_CONVERTINGXMLTEXTTODOC') + e.message);
			}
		} else if (window.DOMParser) {
			try {
				var parser = new DOMParser();
				xmlDoc = parser.parseFromString(xmlText, 'text/xml');
			} catch (e) {
				this.showMessage(e.name + this.getResource('ERROR_CONVERTINGXMLTEXTTODOC') + e.message);
			}
		} else {
			this.showMessage(this.getResource('ERROR_XMLDOMUNSUPPORTED'));
		}
		return xmlDoc;
	},

	xmlConvertDocToText : function (xmlDoc) {
		var xmlText = null;
		if (window.ActiveXObject) {
			try {
				xmlText = xmlDoc.xml;
			} catch (e) {
				this.showMessage(e.name + this.getResource('ERROR_CONVERTINGXMLDOCTOTEXT') + e.message);
			}
		} else if (window.DOMParser) {
			try {
				xmlText = (new XMLSerializer()).serializeToString(xmlDoc);
			} catch (e) {
				this.showMessage(e.name + this.getResource('ERROR_CONVERTINGXMLDOCTOTEXT') + e.message);
			}
		} else {
			this.showMessage(this.getResource('ERROR_XMLDOMUNSUPPORTED'));
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

	xmlEscapeMore : function (content) {
		var repCont = null;
		if (typeof content !== 'undefined' && content !== null) {
			repCont = content.replace(/&/g, '&amp;')
				.replace(/;/g, '&semi;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&apos;')
				.replace(/\r?\n/g, '%0A')
				.replace(/,/g, '&comma;')
				.replace(/:/g, '&colon;');
		}
		return repCont;
	},

	xmlUnescapeMore : function (content) {
		var repCont = null;
		if (typeof content !== 'undefined' && content !== null) {
			repCont = content.replace(/&colon;/g, ":")
				.replace(/&comma;/g, ",")
				.replace(/%0A/g, '\n')
				.replace(/&apos;/g, "'")
				.replace(/&quot;/g, '"')
				.replace(/&gt;/g, '>')
				.replace(/&lt;/g, '<')
				.replace(/&semi;/g, ";")				
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

	// This is a not a generic JSON to DP conversion function.  It is tailored to the objects and select elements in this application (CDATA not currently supported).
	jsonConvertObjectToDataProvider : function (jsonObject) {
		var dataProvider = [];
		for (var i = 0, j = jsonObject.length; i < j; i++) {
			// Remove preceeding '../../' to change path from relative to load handler to relative to Viewer.
			var filePath = jsonObject[i];
			var dataVal = filePath.substring(filePath.indexOf('../../') + 6, filePath.length);
			var dataTxt = dataVal.substring(dataVal.lastIndexOf('/') + 1, dataVal.lastIndexOf('.'));
			dataProvider[dataProvider.length] = { text:dataTxt, value:dataVal, poiID:'0' };
		}
		return dataProvider;
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
						w: arrFrom[i].w,
						h: arrFrom[i].h,
						image: arrFrom[i].image,
						lineStyle: arrFrom[i].lineStyle
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


	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::::::::::::::::: RULER & MEASURING UTILITY FUNCTIONS ::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	convertZoomPercentToMagnification : function (zoom, srcMag, constrain) {
		var mag = zoom * srcMag / 100;
		if (constrain) { mag = (mag < 1.5) ? 1.25 : (mag < 2) ? 1.5 : (mag < 2.5) ? 2 : (mag < 4) ? 2.5 : (mag < 5) ? 4 : (mag < 10) ? 5 : (mag < 16) ? 10 : (mag < 20) ? 16 : (mag < 25) ? 20 : (mag < 32) ? 25 : (mag < 40) ? 32 : (mag < 50) ? 40 : (mag < 60) ? 50 : (mag < 100) ? 60 : (mag < 150) ? 100: (mag < 250) ? 150 : 250; }
		return mag;
	},

	calculatePointsDistance : function (x1, y1, x2, y2) {
		return Math.sqrt((x1 -= x2) * x1 + (y1 -= y2) * y1);

		// DEV NOTE: Alternative implementation:
		//return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
	},

	convertPixelsToUnits : function (pixels, pixelsPerUnit, unitsPerImage) {
		var actualPixelsPerUnit = 1;
		if (typeof pixelsPerUnit !== 'undefined' && pixelsPerUnit !== null && pixelsPerUnit != 0) {
			actualPixelsPerUnit = pixelsPerUnit;
		} else if (typeof unitsPerImage !== 'undefined' && unitsPerImage !== null && unitsPerImage != 0) {
			actualPixelsPerUnit = Z.imageW / unitsPerImage;
		}
		var units = pixels / actualPixelsPerUnit;
		return units;
	},

	polygonArea : function (polyPts, polyClosed, clickPt, digits) {
		if (typeof digits === 'undefined' || digits === null) { digits = 4; }
		var tPolyPts = polyPts.slice(0);

		// Use first control point or mouse position as last control point.
		if (polyClosed) {
			tPolyPts[tPolyPts.length] = { x:tPolyPts[0].x, y:tPolyPts[0].y };
		} else if (typeof clickPt !== 'undefined' && clickPt !== null) {
			tPolyPts[tPolyPts.length] = { x:clickPt.x, y:clickPt.y };
		}

		var sum1 = 0;
		var sum2 = 0;
		for (var i = 0, j = tPolyPts.length - 1; i < j; i++) {
			sum1 += tPolyPts[i].x * tPolyPts[i + 1].y;
			sum2 += tPolyPts[i].y * tPolyPts[i + 1].x;
		}

		var area = (sum1 - sum2) / 2;
		area = Z.Utils.convertPixelsToUnits(area, Z.pixelsPerUnit, Z.unitsPerImage);
		area = Z.Utils.convertPixelsToUnits(area, Z.pixelsPerUnit, Z.unitsPerImage); // Scale in both dimensions.
		area = Z.Utils.roundToFixed(Math.abs(area), digits);

		return area;
	},

	polygonCenter : function (polyPts, polyClosed, clickPt, simplePts) {
		var ctrX = 0, ctrY = 0;
		if (typeof polyPts !== 'undefined' && polyPts !== null && polyPts.length > 0) {
			var tPolyPts = polyPts.slice(0);

			if (simplePts) {		
				if (polyPts.length == 2) {
					ctrX = tPolyPts[0];
					ctrY = tPolyPts[1];
				} else {
					// Use first control point or mouse position as last control point.
					tPolyPts[tPolyPts.length] = [tPolyPts[0][0], tPolyPts[0][1]];

					var tPolyPt = tPolyPts[0];
					var smallestX = tPolyPt[0];
					var smallestY = tPolyPt[1];
					var largestX = tPolyPt[0];
					var largestY = tPolyPt[1];
					for (var i = 1, j = tPolyPts.length; i < j; i++) {
						tPolyPt = tPolyPts[i];
						smallestX = Math.min(smallestX, tPolyPt[0]);
						smallestY = Math.min(smallestY, tPolyPt[1]);
						largestX = Math.max(largestX, tPolyPt[0]);
						largestY = Math.max(largestY, tPolyPt[1]);
					}
					ctrX = smallestX + ((largestX - smallestX) / 2);
					ctrY = smallestY + ((largestY - smallestY) / 2);
				}

			} else {
				// Use first control point or mouse position as last control point.
				if (polyClosed) {
					tPolyPts[tPolyPts.length] = { x:tPolyPts[0].x, y:tPolyPts[0].y };
				} else if (typeof clickPt !== 'undefined' && clickPt !== null) {
					tPolyPts[tPolyPts.length] = { x:clickPt.x, y:clickPt.y };
				}

				var tPolyPt = tPolyPts[0];
				var smallestX = tPolyPt.x;
				var smallestY = tPolyPt.y;
				var largestX = tPolyPt.x;
				var largestY = tPolyPt.y;
				for (var i = 1, j = tPolyPts.length; i < j; i++) {
					tPolyPt = tPolyPts[i];
					smallestX = Math.min(smallestX, tPolyPt.x);
					smallestY = Math.min(smallestY, tPolyPt.y);
					largestX = Math.max(largestX, tPolyPt.x);
					largestY = Math.max(largestY, tPolyPt.y);
				}
				ctrX = smallestX + ((largestX - smallestX) / 2);
				ctrY = smallestY + ((largestY - smallestY) / 2);
			}
		}
		return new Z.Utils.Point(ctrX, ctrY);
	},

	PolygonDimensions : function (polyPts, clickPt) {
		var w = 0, h = 0;
		if (typeof polyPts !== 'undefined' && polyPts !== null && polyPts.length > 0) {
			var tPolyPts = polyPts.slice(0);

			// Optional second parameter enables use of mouse position as last control point. Reduce span
			// so container is not under mouse, to avoid conflict between alt-click-drag and alt-click complete.
			if (typeof clickPt !== 'undefined' && clickPt !== null) {
				var adjX = (tPolyPts[tPolyPts.length - 1].x - clickPt.x) * 0.1;
				var adjY = (tPolyPts[tPolyPts.length - 1].y - clickPt.y) * 0.1;
				tPolyPts[tPolyPts.length] = { x:clickPt.x + adjX, y:clickPt.y + adjY };
			}

			var smallestX = tPolyPts[0].x;
			var smallestY = tPolyPts[0].y;
			var largestX = tPolyPts[0].x;
			var largestY = tPolyPts[0].y;
			for (var i = 1, j = tPolyPts.length; i < j; i++) {
				if (tPolyPts[i].x < smallestX) { smallestX = tPolyPts[i].x; }
				if (tPolyPts[i].x > largestX) { largestX = tPolyPts[i].x; }
				if (tPolyPts[i].y < smallestY) { smallestY = tPolyPts[i].y; }
				if (tPolyPts[i].y > largestY) { largestY = tPolyPts[i].y; }
			}
			w = largestX - smallestX;
			h = largestY - smallestY;
		}

		this.w = w;
		this.h = h;
	},

	polygonPerimeter : function (polyPts, polyClosed, clickPt, digits) {
		if (typeof digits === 'undefined' || digits === null) { digits = 5; }
		var tPolyPts = polyPts.slice(0);

		// Use first control point or mouse position as last control point.
		if (polyClosed) {
			tPolyPts[tPolyPts.length] = { x:tPolyPts[0].x, y:tPolyPts[0].y };
		} else if (typeof clickPt !== 'undefined' && clickPt !== null) {
			tPolyPts[tPolyPts.length] = { x:clickPt.x, y:clickPt.y };
		}

		var perimeter = 0;
		for (var i = 0, j = tPolyPts.length - 1; i < j; i++ ) {
			perimeter += Z.Utils.calculatePointsDistance(tPolyPts[i].x, tPolyPts[i].y, tPolyPts[i + 1].x, tPolyPts[i + 1].y);
		}
		perimeter = Z.Utils.convertPixelsToUnits(perimeter, Z.pixelsPerUnit, Z.unitsPerImage);
		perimeter = Z.Utils.roundToFixed(Math.abs(perimeter), digits);

		return perimeter;
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//:::::::::: SCREEN MODE, ROTATION, & TRANSLATION UTILITY FUNCTIONS ::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	fullScreenView : function (element, fullScreen, escaped) {
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
			if (eventString) { Z.Utils.addEventListener(document, eventString, Z.Viewport.fullScreenEscapeHandler); }

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
			if (eventString) { Z.Utils.removeEventListener(document, eventString, Z.Viewport.fullScreenEscapeHandler); }
		}
	},

	rotatePoint : function (x, y, rotDegs) {
		var degToRad = Math.PI / 180;
		var rotRads = -rotDegs * degToRad;
		var newX = x * Math.cos(rotRads) - y * Math.sin(rotRads);
		var newY = x * Math.sin(rotRads) + y * Math.cos(rotRads);
		return new Z.Utils.Point(newX, newY);
	},
	
	rotatePointOffCenter : function (ctrX, ctrY, endX, endY, rotDegs) {		
		var rotRads = rotDegs * Math.PI / 180;
		var x = endX - ctrX;
		var y = endY - ctrY;
		var rotX = x * Math.cos(rotRads) - y * Math.sin(rotRads);
		var rotY = x * Math.sin(rotRads) + y * Math.cos(rotRads);
		var newX = rotX + ctrX;
		var newY = rotY + ctrY;
		return new Z.Utils.Point(newX, newY);
	},

	rotateElement : function (displayS, r, override) {
		// DEV NOTE: Condition below is workaround for Safari mispositioning of hotspot captions after application of this method. This workaround only addresses unrotated displays.
		// Override ensures first condition does not block rotation of Navigator image as its r will equal Z.imageR because it is always catching up to main display.
		if (r != Z.imageR || override) {
			var tranString = 'rotate(' + r.toString() + 'deg)';
			displayS.transform = tranString; // Standard.
			displayS.msTransform = tranString; // IE9.
			displayS.mozTransform = tranString; // Firefox.
			displayS.webkitTransform = tranString; // Chrome & Safari.
			displayS.oTransform = tranString; // Opera.
		}
	},

	// DEV NOTE: Not currently in use. Untested.
	getElementRotation : function (display) {
		var cmpSt = window.getComputedStyle(display, null);
		var trnsFrm = cmpSt.getPropertyValue("-webkit-transform") || cmpSt.getPropertyValue("-moz-transform") || cmpSt.getPropertyValue("-ms-transform") || cmpSt.getPropertyValue("-o-transform") || cmpSt.getPropertyValue("transform") || 'error failure';
		var values = trnsFrm.split('(')[1];
		values = values.split(')')[0];
		values = values.split(',');
		var a = values[0];
		var b = values[1];
		var c = values[2];
		var d = values[3];
		var scale = Math.sqrt(a * a + b * b);
		var sin = b / scale;
		var angle = Math.round(Math.asin(sin) * (180/Math.PI));
		return angle;	
	},		

	getPositionRotated : function (pLeft, pTop, oLeft, oTop, r) {
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
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

	getDisplayPositionRotated : function (displayS, r) {
		if (typeof r === 'undefined' || r === null) { r = Z.imageR; }
		if (r < 0) { r += 360; } // Ensure positive values.
		var pLeft = parseFloat(displayS.left);
		var pTop = parseFloat(displayS.top);
		var w = parseFloat(displayS.width);
		var h = parseFloat(displayS.height);
		var oLeft = pLeft + w / 2;
		var oTop = pTop + h / 2;
		var rotPoint = Z.Utils.getPositionRotated(pLeft, pTop, oLeft, oTop, r);
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
			
	updateRotationForLegacyMedia : function (legacyShape) {
		var r = 0;
		switch (legacyShape) {
			case 'arrowDownLeft' :
				r += 45;
				break;
			case 'arrowLeft' :
				r += 90;
				break;
			case 'arrowUpLeft' :
				r += 135;
				break;
			case 'arrowUp' :
				r += 180;
				break;
			case 'arrowUpRight' :
				r += 225;
				break;
			case 'arrowRight' :
				r += 270;
				break;
			case 'arrowDownRight' :
				r += 315;
				break;
			case 'lineHorizontal' :
				r += 90;
				break;			
		}
		return r;
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
	validateResponseArrayFunctionality : function () {
		if ((Z.tileSource == 'ZoomifyZIFFile'  || (Z.tileSource == 'ZoomifyPFFFile' && Z.tileHandlerPathFull === null)) && !Z.responseArraySupported && !Z.responseArrayPrototyped) {
			Z.Utils.defineObjectProperty(XMLHttpRequest.prototype, 'response', {
				get : function () { return new VBArray(this.responseBody).toArray(); }
			});
			Z.responseArrayPrototyped = true;
		}
	},
	
	setObjectProperty : function (obj, name, def) {
		if (Z.definedObjectPropertiesArr.indexOf(name) != -1) {
			obj[name] = def.value;
		} else {
			Z.Utils.defineObjectProperty(obj, name, def);
			Z.definedObjectPropertiesArr[Z.definedObjectPropertiesArr.length] = name;
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
		var year = date.getUTCFullYear();
		var month = ((date.getUTCMonth() + 1 < 10) ? '0' : '') + (date.getUTCMonth() + 1);
		var day = ((date.getUTCDate() < 10) ? '0' : '') + date.getUTCDate();
		var hour = ((date.getUTCHours() < 10) ? '0' : '') + date.getUTCHours();
		var minute = ((date.getUTCMinutes() < 10) ? '0' : '') + date.getUTCMinutes();
		var second = ((date.getUTCSeconds() < 10) ? '0' : '') + date.getUTCSeconds();
		var dateTime = year + month + day + '-' + hour + minute + second;		
		return dateTime;
	},

	cacheProofPath : function (url) {
		// Uses time stamp plus counter to guarantee uniqueness. Implementation with only time stamp fails to produce unique value on some versions of some browsers, and appending Math.random() slower.
		// Apply to support setImage feature, non-caching implementations, and to avoid IE problem leading to correct image with wrong dimensions. (DEV NOTE: Formerly limited to Z.browser == Z.browsers.IE)
		// Note: currently applied to most XML calls prior to loadXML(), to image folder tile requests in function formatTilePathImageFolder.  NOT applied directly in loadXML function in Z.NetConnector because not
		// applied to all XML paths. Not applied to annotation XML where Z.simplePath used to prevent modifications to provided path. Also not applied to JSON paths. Not applied in PFF requests due to server
		// parsing requirements. Applied to all ZIF byterange requests directly in Z.NetConnector. Further consolidation and broader application anticipated in future releases.
		url += '?t' + new Date().getTime().toString() + 'n' + Z.cacheProofCounter.toString();
		Z.cacheProofCounter += 1;
		return url;
	},

	easing : function (b, t, c, d, effect) {
		// Key: b=beginning position, t=target position, c=current time or position, d=duration or distance total, calculated s = span.
		if (typeof effect === 'undefined' || effect === null) { effect = Z.smoothZoomEasing; }
		var retVal = t;

		if (Z.smoothZoom && effect > 1) {
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

	nodeIsInViewer : function (nodeToTest) {
		var isInViewer = false;
		var ancestor = nodeToTest;
		while (isInViewer == false) {
			if (ancestor) {
				if (ancestor.id) {
					if (ancestor.id == 'ViewerDisplay') {
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
	
	pointIsInViewer : function (mPt) {
		var isInBorder = false;
		var elem = document.getElementById(Z.pageContainerID);
		if (elem) {
			var computedW = parseFloat(Z.Utils.getElementStyleProperty(elem, 'width'));
			var computedH = parseFloat(Z.Utils.getElementStyleProperty(elem, 'height'));
			var pagePixelPt = Z.Utils.getElementPosition(elem);
			if (!isNaN(computedW) && !isNaN(computedH) && !isNaN(pagePixelPt.x) && !isNaN(pagePixelPt.y)) {
				var left = pagePixelPt.x;
				var right = left + computedW;
				var top = pagePixelPt.y;
				var bottom = top + computedH;
				if (mPt.x > left && mPt.x < right && mPt.y > top && mPt.y < bottom) { isInBorder = true; }
			}
		}
		return isInBorder;
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
	},



	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::: DEBUGGING UTILITY FUNCTIONS :::::::::::::::::::::::::::
	//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	drawCrosshairs : function (display, w, h, crosshairColor) {
		if (typeof display === 'undefined' || display === null) { display = Z.ViewerDisplay; }
		if (typeof w === 'undefined' || w === null) { w = Z.viewportCurrent.getViewW(); }
		if (typeof h === 'undefined' || h === null) { h = Z.viewportCurrent.getViewH(); }
		if (typeof crosshairColor === 'undefined' || crosshairColor === null) { crosshairColor = '#696969'; }

		var viewportCenterLineHorizontal = document.getElementById('viewportCenterLineHorizontal');
		var viewportCenterLineVertical = document.getElementById('viewportCenterLineVertical');
		if (viewportCenterLineVertical || viewportCenterLineHorizontal) { Z.Utils.hideCrosshairs(); }

		var viewportCenterLineHorizontal = Z.Utils.createContainerElement('div', 'viewportCenterLineHorizontal', 'inline-block', 'absolute', 'visible', w + 'px', '1px', '0px', (h / 2) + 'px', 'solid', '1px', 'transparent', '0px', '0px', 'normal', null, true, crosshairColor);
		var viewportCenterLineVertical = Z.Utils.createContainerElement('div', 'viewportCenterLineVertical', 'inline-block', 'absolute', 'visible', '1px', h + 'px', (w / 2) + 'px', '0px', 'solid', '1px', 'transparent', '0px', '0px', 'normal', null, true, crosshairColor);
		display.appendChild(viewportCenterLineHorizontal);
		display.appendChild(viewportCenterLineVertical);
	},	

	hideCrosshairs : function (display) {
		if (typeof display === 'undefined' || display === null) { display = Z.ViewerDisplay; }
		var viewportCenterLineHorizontal = document.getElementById('viewportCenterLineHorizontal');
		var viewportCenterLineVertical = document.getElementById('viewportCenterLineVertical');
		if (viewportCenterLineHorizontal) { display.removeChild(viewportCenterLineVertical); }
		if (viewportCenterLineVertical) { display.removeChild(viewportCenterLineHorizontal); }
	},

	configureHelpDisplay : function () {
		// Calculate help display dimensions, position, and presentation.
		var marginW = 80, marginH = 80;
		var mdW = Z.helpW;
		var mdH = Z.helpH;
		if (mdW >= Z.viewerW) {
			mdW = Z.viewerW - marginW;
			marginW -= 40;
		}
		if (mdH >= Z.viewerH) {
			mdH = Z.viewerH - marginH;
			marginH -= 40;
		}
		var mdL = (Z.helpL) ? Z.helpL : (Z.viewerW - mdW) / 2;
		var mdT = (Z.helpT) ? Z.helpT : (Z.viewerH - mdH) / 2;
		var scrnColor = this.getResource('UI_HELPSCREENCOLOR');
		var btnColor = this.getResource('UI_HELPBUTTONCOLOR');

		// Create help display.
		Z.HelpDisplay = this.createContainerElement('div', 'HelpDisplay', 'inline-block', 'absolute', 'hidden', mdW + 'px', mdH + 'px', mdL + 'px', mdT + 'px', 'solid', '1px', scrnColor, '0px', '0px', 'normal', null, true);
		Z.ViewerDisplay.appendChild(Z.HelpDisplay);
		var helpTextBox = Z.Utils.createContainerElement('div', 'helpTextBox', 'inline-block', 'absolute', 'auto', (mdW - 50) + 'px', (mdH - 74) + 'px', '4px', '4px', 'solid', '1px', 'white', '0px', '20px', null);
		
		// DEV NOTE: the following attempt fails for iOS and Android. No scrollbar on Help textarea display.
		helpTextBox.style.overflowY = (Z.mobileDevice) ? 'scroll' : 'auto';
		
		// Alternative implementation: Text rather than HTML content.
		//var helpTextBox = Z.Utils.createTextElement('helpTextBox', '', (mdW - 18) + 'px', (mdH - 40) + 'px', '4px', '4px', '4px', 'solid', '1px', true, 'verdana', '12px', 'none', null, 1, 'auto', 'auto', null);
		Z.HelpDisplay.appendChild(helpTextBox);
		Z.help = document.getElementById('helpTextBox');

		// Ensure proper z-ordering of Viewer elements.
		Z.HelpDisplay.style.zIndex = (Z.baseZIndex + 38).toString();

		// Configure and add display buttons.
		var btnW = 56;
		var btnH = 18;
		var dvdrW = 10;
		var dvdrH = 5;
		var btnL = mdW;
		var btnT = mdH - btnH - dvdrH;
		var btnTxt;

		btnL -= (btnW + dvdrW);
		btnTxt = this.getResource('UI_HELPOKBUTTONTEXT');
		var buttonHelpOk = new Z.Utils.Button('buttonHelpOk', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', this.helpOkButtonHandler, 'TIP_HELPOK', 'solid', '1px', btnColor, '0px', '0px');
		Z.HelpDisplay.appendChild(buttonHelpOk.elmt);

		// Initially hide help.
		Z.HelpDisplay.style.display = 'none';
	},

	helpOkButtonHandler : function (event) {
		Z.Utils.hideHelp();
		return true;
	},

	showHelp : function (helpContent) {
		// Create help display on first use.
		if (!Z.HelpDisplay) { Z.Utils.configureHelpDisplay(); }

		if (Z.help) {
			if (!Z.helpCustom) {
				Z.help.innerHTML = unescape(helpContent);
			} else {
				// If zHelpPath present use previously loaded custom help page in place of default internal content.
				Z.help.innerHTML = Z.helpContent;
			}

			// Toggle to hide if visible.
			var displayVal = (Z.HelpDisplay.style.display != 'inline-block') ? 'inline-block' : 'none';
			Z.HelpDisplay.style.display = displayVal;

			var buttonHelpOk = document.getElementById('buttonHelpOk');
			buttonHelpOk.style.display = 'inline-block';

			// Alternative implementation: Text rather than HTML content.
			//Z.help.value = helpContent;
			//var mTB = document.getElementById('textBoxFor-helpBox');
			//if (mTB) { mTB.firstChild.style.textAlign = 'left'; }
		}
	},

	hideHelp : function () {
		Z.HelpDisplay.style.display = 'none';
	},

	configureMessageDisplay : function () {
		// Calculate message display dimensions, position, and presentation.
		var mdW = parseInt(this.getResource('UI_MESSAGEDISPLAYWIDTH'), 10);
		var mdH = parseInt(this.getResource('UI_MESSAGEDISPLAYHEIGHT'), 10);

		var displayCoords = Z.Utils.getMessageDisplayCoords('6', mdW, Z.viewerW, Z.viewerH); // Z.viewerW allows for toolbar height if static in viewer display area.

		var scrnColor = this.getResource('DEFAULT_MESSAGESCREENCOLOR');
		var btnColor = this.getResource('DEFAULT_MESSAGEBUTTONCOLOR');

		// Create message display.
		Z.MessageDisplay = this.createContainerElement('div', 'MessageDisplay', 'inline-block', 'absolute', 'auto', mdW + 'px', mdH + 'px', displayCoords.x + 'px', displayCoords.y + 'px', 'solid', '1px', scrnColor, '0px', '0px', 'normal', null, true);
		Z.ViewerDisplay.appendChild(Z.MessageDisplay);

		// Ensure proper z-ordering of Viewer elements.
		Z.MessageDisplay.style.zIndex = (Z.baseZIndex + 40).toString();

		var messageBox = Z.Utils.createTextElement('messageBox', '', (mdW - 18) + 'px', (mdH - 40) + 'px', '4px', '4px', '4px', 'solid', '1px', true, 'verdana', '12px', 'none', null, 1, 'auto', 'auto', null);
		Z.MessageDisplay.appendChild(messageBox);
		Z.messages = document.getElementById('messageBox');

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
		btnTxt = this.getResource('UI_MESSAGECANCELBUTTONTEXT');
		var buttonMessageCancel = new Z.Utils.Button('buttonMessageCancel', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', this.messageCancelButtonHandler, 'TIP_MESSAGECANCEL', 'solid', '1px', btnColor, '0px', '0px');
		Z.MessageDisplay.appendChild(buttonMessageCancel.elmt);
		*/

		btnL -= (btnW + dvdrW);
		btnTxt = this.getResource('UI_MESSAGEOKBUTTONTEXT');
		var buttonMessageOk = new Z.Utils.Button('buttonMessageOk', btnTxt, null, null, null, null, btnW + 'px', btnH + 'px', btnL + 'px', btnT + 'px', 'mousedown', this.messageOkButtonHandler, 'TIP_MESSAGEOK', 'solid', '1px', btnColor, '0px', '0px');
		Z.MessageDisplay.appendChild(buttonMessageOk.elmt);
	},

	getMessageDisplayCoords : function (position, displayW, viewerW, viewerH) {
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
				if (Z.toolbarVisible > 0 && Z.toolbarVisible != 8) {
					displayY = viewerH - margin * 3;
				} else {
					displayY = viewerH - margin * 2;
				}
				break;
			case '5':
				displayX = viewerW / 2 - displayW / 2;
				if (Z.toolbarVisible > 0 && Z.toolbarVisible != 8) {
					displayY = viewerH - margin * 3;
				} else {
					displayY = viewerH - margin * 2;
				}
				break;
			case '6':
				displayX = margin;
				if (Z.toolbarVisible > 0 && Z.toolbarVisible != 8) {
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
	},

	messageOkButtonHandler : function (event) {
		Z.Utils.hideMessage();
		return true;
	},

	messageCancelButtonHandler : function (event) {
		// DEV NOTE: Cancel option not required by current feature set.
		Z.Utils.hideMessage();
		return false;
	},

	showMessage : function (messageText, button, displayTime, textAlign, once, position) {
		// Parameter zMessagesVisible permits disabling display.
		if (Z.messagesVisible) {

			// Create message display on first use and clear any pending message timers prior to new use.
			if (!Z.MessageDisplay) { Z.Utils.configureMessageDisplay(); }

			//Message display positioning: 1 top-left, 2 top-center, 3 top-right, 4 bottom right, 5 bottom-center, 6 bottom left.
			if (typeof position === 'undefined' || position === null) { position = '6'; }
			var mdW = parseInt(this.getResource('UI_MESSAGEDISPLAYWIDTH'), 10);
			var displayCoords = Z.Utils.getMessageDisplayCoords(position, mdW, Z.viewerW, Z.viewerH); // Z.viewerW allows for toolbar height if static in viewer display area.
			Z.MessageDisplay.style.left = displayCoords.x + 'px';
			Z.MessageDisplay.style.top = displayCoords.y + 'px';

			if (Z.MessageDisplay.messageTimer) { Z.Utils.hideMessageTimerHandler(); }

			// Record and check prior displays if message to be displayed only once.
			var displayOK = true;
			if (once) {
				if (Z.Utils.arrayIndexOf(Z.messageDisplayList, messageText) != -1) {
					displayOK = false;
				} else {
					Z.messageDisplayList[Z.messageDisplayList.length] = messageText;
				}
			}
			if (displayOK) {
				// Show message display.
				if (Z.messages) { Z.messages.value = messageText; }
				Z.MessageDisplay.style.display = 'inline-block';
				if (typeof textAlign !== 'undefined' && textAlign !== null) {
					var mTB = document.getElementById('textBoxFor-messageBox');
					if (mTB) { mTB.firstChild.style.textAlign = textAlign; }
				}

				// Add buttons if specified.
				var buttonMessageOk = document.getElementById('buttonMessageOk');
				var mdH = parseInt(this.getResource('UI_MESSAGEDISPLAYHEIGHT'), 10);
				if (typeof button !== 'undefined' && button !== null && button) {
					buttonMessageOk.style.display = 'inline-block';
					Z.MessageDisplay.style.height = mdH + 'px';
				} else {
					buttonMessageOk.style.display = 'none';
					Z.MessageDisplay.style.height = (mdH - 22) + 'px';
				}

				// Automatically hide message if display time specified.
				if (typeof displayTime !== 'undefined' && displayTime !== null && !isNaN(displayTime)) {
					if (typeof Z.MessageDisplay.messageTimer !== 'undefined' && Z.MessageDisplay.messageTimer !== null) { window.clearTimeout(Z.MessageDisplay.messageTimer); }
					if (typeof displayTime === 'undefined' || displayTime === null) { displayTime = 3000; }
					Z.MessageDisplay.messageTimer = window.setTimeout(Z.Utils.hideMessageTimerHandler, displayTime);
				}
			}
		}
	},

	getMessage : function () {
		var messageText = '';
		if (Z.messages && Z.Utils.stringValidate(Z.messages.value)) {
			messageText = Z.messages.value;
		}
		return messageText;
	},

	hideMessage : function () {
		if (Z.MessageDisplay) {
			Z.MessageDisplay.style.display = 'none';
		}
	},

	hideMessageTimerHandler : function () {
		if (Z.MessageDisplay.messageTimer) {
			window.clearTimeout(Z.MessageDisplay.messageTimer);
			Z.MessageDisplay.messageTimer = null;
		}
		Z.Utils.hideMessage();
	},

	uploadProgress : function (event) {
		var messageText = Z.saveImageMessage;
		if (event.lengthComputable) {
			var percentComplete = Math.round(event.loaded * 100 / event.total);
			messageText += percentComplete.toString() + '%';
		} else {
			messageText += Z.Utils.getResource('ERROR_IMAGESAVEUNABLETOCOMPUTEPROGRESS');
		}
		Z.Utils.showMessage(messageText, false, 'none', 'center');
	},

	trace : function (text, blankLineBefore, blankLineAfter) {
		var preLines = (blankLineBefore) ? '\n' : '';
		var postLines = (blankLineAfter) ? '\n\n' : '\n';
		if (!Z.TraceDisplay) { Z.Utils.configureTraceDisplay(); }
		if (Z.traces) {
			Z.traces.value += preLines + text + postLines;
			if (Z.debug == 2) { Z.traces.scrollTop = Z.traces.scrollHeight; }
		}
	},

	traceTileStatus : function (required, cached, requested, loaded, displayed, waiting) {
		if (!(trTS && tcTS && trqTS && tlTS && tdTS && twTS)) {
			var trTS = document.getElementById('tilesRequiredTextElement');
			var tcTS = document.getElementById('tilesCachedTextElement');
			var trqTS = document.getElementById('tilesRequestedTextElement');
			var tlTS = document.getElementById('tilesLoadedTextElement');
			var tdTS = document.getElementById('tilesDisplayedTextElement');
			var twTS = document.getElementById('tilesWaitingTextElement');
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
	},

	traceTileSpeed : function (tmElpsd, loadsPerSec) {
		if (!(tteTS && tpsTS)) {
			var tteTS = document.getElementById('tilesTimeElapsedTextElement');
			var tpsTS = document.getElementById('tilesPerSecondTextElement');
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
};