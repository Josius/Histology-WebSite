<?php

	/**::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
	@license Zoomify Image Viewer support file, Copyright Zoomify, Inc., 1999-2018. All rights reserved. You may
	use this file on private and public websites, for personal and commercial purposes, with or without modifications, so long as this
	notice is included. Redistribution via other means is not permitted without prior permission. Additional terms apply. For complete
	license terms please see the Zoomify License Agreement in this product and on the Zoomify website at www.zoomify.com.
	::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	Debugging note: place echo $accessType or other variable below and view in JavaScript using console.log(xhr.responseText); in receiveResponse function.
	*/

	// Determine whether loading file list, saving, renaming, deleting, or saving an image.
	$accessType = $_GET["accessType"];

	switch ($accessType) {

		case "list" :

			// Get file path and file type(s) from url query string.
			$filePath = $_GET["filePath"];
			$fileTypes = $_GET["fileTypes"];
			$fileTypesArray = explode("@", $fileTypes);

			// Get directory list filtered for file types.
			$fileListArray = [];
			foreach ($fileTypesArray as $fileType) {
				$fileListArray = array_merge ($fileListArray, glob($filePath . "*." . $fileType));
			}

			// Convert resulting array to JSON object and return result.
			$fileListString = json_encode($fileListArray);
			echo $fileListString;
			break;

		case "save" :

			// Get file and post data.
			$post="";
			$ph=fopen("php://input", "rb");
			while (!feof($ph)) {
				$post .= fread($ph, 4096);
			}
			fclose($ph);

			$filePathAndName = $_GET["filePath"];
			if ($filePathAndName) {
				$fp = fopen($filePathAndName, "w+");
				if ($fp) {
					fputs($fp, $post);
					fclose($fp);
					echo "Saved: " . $filePathAndName;
				} else {
					echo "Failed to save: " . $filePathAndName;
				}
			}
			break;

		case "rename" :

			 // Get current and new filename from url query string.
			$oldName = $_GET["filePathOld"];
			$newName = $_GET["filePathNew"];

			// Rename file and return new result.
			rename($oldName, $newName);
			echo "New name: " . $newName;
			break;

		case "delete" :

			// Get file path from url query string.
			$filePath = $_GET["filePath"];

			// Delete file and return delete result.
			$fp = unlink($filePath);
			if ($fp) {
				echo "Deleted: " . $filePath;
			} else {
				print_r(error_get_last());
			}
			break;

		case "saveImage" :

			// Data start example: 'zoomifySavedImage,data:image/jpeg;base64,iVBOR...' or 'data:image/png;base64,iVBOR...'

			$rawData = file_get_contents("php://input");

			$beginData = strpos($rawData, "filePath") + 17;
			$endData = strpos($rawData, "==");
			$postData = substr($rawData, $beginData, $endData - $beginData);

			$delim0 = strpos($postData, ",");
			$delim1 = strpos($postData, "image/") + 6;
			$delim2 = strpos($postData, ";");
			$delim3 = strpos($postData, ",", $delim2);

			if ($delim0 && $delim1 && $delim2 && $delim3) {
				$fileNameTest = substr($postData, 0, $delim0);
				$fileName = (isset($fileNameTest)) ? $fileNameTest : 'zoomifySavedImage';
				$fileFormat = substr($postData, $delim1, $delim2 - $delim1);
				$fileExtension = ($fileFormat == 'jpeg') ? 'jpg' : $fileFormat;
				$fileName = $fileName . '.' . $fileExtension;

				$filteredCanvasData = substr($postData, $delim3 + 1);
				if (isset($filteredCanvasData)) {
					$unencodedData = base64_decode($filteredCanvasData);
					$fp = fopen($fileName, 'wb');
					fwrite($fp, $unencodedData);
					fclose($fp );

					// Debug option: replace $fp and fwrite lines above with the following:
					//$fp = fopen('ztest.txt', 'wb');
					//fwrite($fp, $fileNameTest . '   ' . $fileName . '   ' . $fileFormat . '   ' . $filteredCanvasData);
				}
			}
			break;
	}

?>