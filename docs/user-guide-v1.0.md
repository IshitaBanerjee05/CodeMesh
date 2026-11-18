# CodeMesh teacher and student guide

This guide describes the current Windows desktop and LAN workflow. Install
CodeMesh on the teacher computer and each student computer that will run
Python or Java locally. Browser participants can join the teacher's host, but
browser Java is not supported and browser Python requires the separate
Pyodide assets described in the README.

## Before class

1. Install the per-user CodeMesh Windows installer on the teacher and student
   computers.
2. Connect all computers to the same trusted router or LAN. The teacher
   computer can use Ethernet; students can use Wi-Fi.
3. Allow CodeMesh to accept private-network connections on TCP port 4173 if
   Windows Firewall prompts. Router client isolation must not block devices
   from reaching one another.
4. Install Python 3 on any computer that will run Python programs. Install a
   JDK with both `javac` and `java` available on PATH on any computer that will
   run Java programs.

The classroom host and its bundled UI do not require internet after
installation. Router/LAN connectivity must remain available. CodeMesh uses
unencrypted HTTP; use only on a trusted classroom network.

## Teacher: start and manage a class

1. Launch CodeMesh and select **Teacher**.
2. Choose **Classroom**, enter a classroom name and optional topic, then select
   **Start classroom session**. The Overview dashboard also offers **Create
   classroom**.
3. Share the displayed classroom code and the host URL that matches the
   classroom router's network adapter, such as `http://192.168.50.10:4173`.
   If several addresses are shown, do not share a VPN or virtual adapter
   address.
4. Open **Live monitor** and approve each expected join request. Reject
   requests that should not enter the class.
5. Use **Exercises** to publish instructions and starter code, and use the
   lock control when students should stop editing. The monitor can show a
   student's latest synchronized workspace read-only.
6. Students select **Submit solution** when finished. Review submissions in
   **Exercises**.
7. Select **End session** when class is over. Ending a session revokes its
   participant access; saved workspace and submission records remain in the
   teacher's local data directory.

## Student: join, work, and submit

1. Launch CodeMesh on the student computer and select **Student**.
2. Enter the teacher's full host URL, classroom code, your name, and roll
   number. Select **Request to join** and wait for teacher approval.
3. After approval, open your workspace. Your files are individual to you;
   edits save locally and synchronize to the host when connected.
4. Use **Run** to execute `.py` files with local Python or `.java` files with
   the local JDK. Programs run with your Windows account's permissions. The
   runner's timeout and output limits do not sandbox code.
5. Select **Submit solution** to send the current files to the teacher.

If Wi-Fi drops, keep CodeMesh open while the connection returns. The app
reconnects and refreshes authoritative workspace/classroom state. A locally
saved draft is retained for recovery, but confirm the sync indicator before
submitting.

## Data and troubleshooting

- Classroom data is stored on the teacher computer in
  `%USERPROFILE%\.codemesh\codemesh.db`. Student browser drafts are stored in
  that browser's local storage; student desktop workspaces synchronize to the
  teacher host.
- Uninstalling CodeMesh does not remove `%USERPROFILE%\.codemesh`.
- If a student cannot load the host URL, confirm both devices are on the same
  LAN, the URL uses the teacher's reachable adapter address and port `4173`,
  Windows Firewall permits private-network traffic, and AP/client isolation
  is disabled.
- If joining fails after the page loads, check that the session is active and
  the classroom code is current. The teacher must approve the request.
- If Run is unavailable in a desktop app, verify Python or the JDK is
  installed and discoverable from PATH, then restart CodeMesh.

Names and roll numbers are student-entered and are not institutionally
verified. Do not use CodeMesh on an untrusted network or for high-stakes
assessment until LAN encryption and OS-level execution isolation are
implemented and validated.
