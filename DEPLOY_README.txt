OOZY Admin Web v1.0.8

Target GitHub repository is fixed:
  https://github.com/449Industry/OOZY-Sales

Expected GitHub Pages URL:
  https://449industry.github.io/OOZY-Sales/

Deployment:
1. Apply the updater ZIP to C:\449INDUSTRIES\oozySales.
2. Open C:\449INDUSTRIES\oozySales\v1\web.
3. Double-click 00_DEPLOY_OOZY_SALES.bat.
4. The script clones the existing OOZY-Sales repository into a temporary folder.
5. Only the canonical integrated web files are copied into the clone.
6. .github/workflows/pages.yml is committed and pushed.
7. GitHub Pages is enabled with GitHub Actions.
8. The script waits for the workflow and opens the final page.

Both GITHUB_DEPLOY.bat and legacy GITHUB_DEPLOY_OOZY.bat now redirect to the same deploy script.
The log file is github_deploy.log.

Updater target:
  C:\449INDUSTRIES\oozySales
ZIP root:
  v1\web\...
Result:
  C:\449INDUSTRIES\oozySales\v1\web\...
