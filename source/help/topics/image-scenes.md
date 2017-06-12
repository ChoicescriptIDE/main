## Image Scenes

By default, when running a play-test game within CSIDE, any use of the *image command in your scripting will attempt to find the external image from your project's directory (the folder containing your scene files).

If desired, however, the 'Import - Image' option will convert a copy of your image into a data string stored directly inside its own scene file. This comes with a small overhead in terms of image size, but it allows support for images in compiled games. We recommend only using this feature with images that are 500 KB or below for optimal functionality.

If the image conversion is successful, a pop-up window will display a *gosub_scene command. Copy and paste the command into the scene files wherever the image should appear.

> **WARNING**: Because image scenes contain the data for an entire image file, they can be rather large. As such, we recommend you avoid opening them within CSIDE for performance reasons (there should never be a need to). CSIDE also ignores any scene file prefixed with 'csideimg' when using 'Open All Scenes', etc.. If you wish to replace an image by changing or altering an image scene, simply delete the old image scene and re-import your image.