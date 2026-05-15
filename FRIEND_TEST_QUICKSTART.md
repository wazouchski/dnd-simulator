# Friend Test Quickstart

This is a very early personal test build. It is meant to be opened, played with, and judged on whether the character import and combat flow make sense.

## File To Send

Send this installer:

```txt
release-current/DND-Character-Balance-Tester-Friend-Test-Setup.exe
```

Also send this visual quickstart:

```txt
release-current/quickstart.pdf
```

Current test build:

```txt
Size: 162,292,528 bytes, about 155 MB
SHA256: DBB3BDFD5596082A350BE437AAEB462A8098BB5BE6A4420E571DA12918A1DDD4
Built: May 10, 2026 1:28 PM
Signing: self-signed test certificate
```

This is the easiest friend-test file. Do not send the unpacked zip unless the installer gives someone trouble.

## Open The App

1. Download **DND-Character-Balance-Tester-Friend-Test-Setup.exe**.
2. Double-click it.
3. If Windows warns you, click **More info**, then **Run anyway**.
4. Let the installer finish.
5. The app should open in its own window.

## Easiest First Test

Start here before trying your own D&D Beyond character.

1. Click **Load sample**.
2. Click **Begin simulation**.
3. Try the playable encounter.
4. Try the batch odds/results panel.
5. Make notes about anything confusing, boring, broken, or hard to read.

## Import A D&D Beyond Character

The character must be **Public** on D&D Beyond first. If it is not public, D&D Beyond may show **Unauthorized Access Attempt**.

1. Open the app.
2. Find the **D&D Beyond import** box.
3. Click **Copy import bookmark code**.
4. Open Brave, Chrome, or Edge.
5. Press **Ctrl + Shift + O** to open Bookmark Manager.
6. Right-click in the bookmark folder and choose **Add new bookmark**.
7. Name it **Send to D&D Simulator**.
8. Paste the copied code into the **URL** box.
9. Save the bookmark.
10. Open the public D&D Beyond character sheet while logged in.
11. Click the **Send to D&D Simulator** bookmark.
12. Go back to the app and check the imported character sheet.

Important: do not paste the import code into the browser address bar. It goes into a bookmark's URL box.

## After Import

Before simulating, check:

- character name, class, level, HP, and AC
- weapons
- spells
- armor and shield
- skills

If something is missing, write it down. This test build is focused on improving full character import.

## What Might Pop Up

This is not a polished public installer yet, so Windows may warn about:

- **Windows protected your PC**
- **Unknown publisher** or an untrusted/self-signed publisher
- a download warning
- an antivirus scan delay
- possibly a Windows Firewall prompt

The app runs a local window and local-only helper server on your own computer. If you trust the person who sent it, choose **More info -> Run anyway**.

## Does It Install Anything?

It installs the desktop app like a normal Windows app. It does not install development tools.

It does not install:

- Node.js
- npm
- Next.js
- React
- Git
- MySQL or any database
- browser extensions
- D&D Beyond credentials
- system services
- drivers

It includes inside the installed app:

- Electron
- Chromium
- the app's built files
- the local import helper
- starter SRD monster data

It may create normal app files in Windows, such as:

```txt
%LOCALAPPDATA%\Programs\D&D Character Balance Tester
%APPDATA%\D&D Character Balance Tester
%TEMP%\...
```

That is normal for desktop apps.

## What Feedback Helps Most

- Where did you get stuck?
- Did any button wording confuse you?
- Did D&D Beyond import your weapons, spells, armor, and skills correctly?
- Did the playable encounter feel fun enough to replay?
- What did you expect the app to do that it did not do?
