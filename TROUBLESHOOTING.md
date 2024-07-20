# Troubleshooting Guide

This document aims to help you resolve common issues you might encounter while using Dataline. If you don't find a solution to your problem here, we've also included steps for manual debugging and reporting issues.

## Table of Contents

- [Can't Connect to the Backend](#cant-connect-to-the-backend)
- [Manual Debugging and Reporting Issues](#manual-debugging-and-reporting-issues)

## Can't Connect to the Backend

If you're having trouble connecting to the backend, consider the following:

- If authentication is enabled and you're connecting via a server (not localhost), it might be a CORS (Cross-Origin Resource Sharing) problem. In this case, run the Docker image with the following additional variables:

  `-e ALLOWED_ORIGINS="http://<your_server_ip>:7377,https://<your_server_ip>:7377"`

  Replace `<your_server_ip>` with your actual server IP address.

If you've tried these steps and are still experiencing connection issues, please proceed to the manual debugging section below.

## Manual Debugging and Reporting Issues

If you're experiencing an issue not covered in this guide, follow these steps to debug and report the problem:

1. Check the console: Open your browser's developer tools and check the console for any error messages. These can provide valuable clues about what's going wrong.

2. Examine network requests: Use the Network tab in your browser's developer tools to examine the requests being made. Look for any failed requests or unexpected responses.

3. Try a different browser: Sometimes issues can be browser-specific. Try reproducing the issue in a different browser to see if the problem persists.

4. Clear cache and cookies: Clear your browser's cache and cookies, then try again. Sometimes outdated cached data can cause unexpected behavior.

5. Report the issue: If you're still experiencing problems, please open a new issue in our GitHub repository. When reporting an issue, gather and include the following information:
   - Your operating system and version
   - Your browser and version
   - Versions of relevant software (docker image tag, etc.)
   - A detailed description of the steps to reproduce the issue
   - Any relevant error messages or screenshots

Use a clear and descriptive title for your issue, and provide all the information you've gathered in the issue description. The more detailed your report, the easier it will be for us to reproduce and fix the problem.

Thank you for your help in improving Dataline! We appreciate your patience and contributions to making our project better.
