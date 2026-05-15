# GitAlert DevOps

Never miss a PR review again. GitAlert DevOps is a Chrome Extension that connects to Azure DevOps and acts as your all-in-one PR review manager.

## Features

- **Project PR Tracking**: Monitor PRs across your Azure DevOps project from one place.
- **PR Statistics Dashboard**: See PRs assigned to you, your PRs pending review, and change requests at a glance.
- **Instant Notifications**: Get desktop notifications the moment a PR is assigned or re-assigned to you.
- **Scheduled Reminders**: Set daily reminders (e.g., 9 AM & 6 PM) so you never forget to review PRs.
- **Secure & Private**: Your Azure DevOps token stays in your browser's local storage. No data ever leaves your machine!

## Installation (Unpacked Extension)

Since we are currently awaiting Web Store publication, you will need to load the extension as an unpacked developer extension.

1. Clone the repository: `git clone https://github.com/farazokc/GitAlert-DevOps-Extension.git`
2. Navigate to `chrome://extensions/` in your browser.
3. Turn on the **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** and select the directory of the cloned repository.

## Tech Stack

- Manifest V3 Chrome Extension
- Vanilla HTML, CSS, JavaScript (ES6 Modules)
- Prettier & ESLint for formatting & linting
- Azure DevOps REST API

## Contributing

Thank you for considering contributing to GitAlert! Please see the `CONTRIBUTING.md` file for instructions on code architecture and open-source submission guidelines.

---

Developed for the 🌍 with ❤️
