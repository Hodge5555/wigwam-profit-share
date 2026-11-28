# WigWam sign-in image uploads

Upload any image into this folder to change the image shown above the Discord sign-in prompt.

## How to change it

1. Open this folder in GitHub.
2. Choose **Add file → Upload files**.
3. Select your image file. The filename can be anything.
4. Commit the upload to the **main** branch.

The main WigWam page displays the newest image above the Discord authorisation message, and the catering sign-in pages use the same image. Pages check for new uploads automatically and swap the displayed image without a full page reload, usually within about 90 seconds. You do not need to edit or rename any website files.

Supported formats: PNG, JPG/JPEG, GIF, WebP, AVIF, SVG and BMP.

**Tip:** Upload one image per commit. When multiple image files are added in the same commit, the last filename alphabetically is selected.
