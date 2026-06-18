# Ungroomed list of features to implement in GitAlert extension

- 1st priority: Package the extension for direct import into browser without requiring `load unpacked extension`
  1. Explore how to pack extension for distribution.
  2. Auto-create extension package/distributable when new release is created on GitHub.
  3. Auto-distribute extension to users.
  4. It is possible. Should be compatible with Edge, Chrome, Brave browsers.

- Support for PRs to be labeled as `urgent`
  1. PR shows up in an `urgent` bucket.
  2. Notify reviewers (optional).
  3. User configurable keywords in PR to label it as urgent (for example PR related to a certain feature)

- Automated reminder mechanics for PR in groups
  1. Remote configurable reminders for PR review (should be controllable by admin).
  2. Personal, configurable reminders for PR review.
