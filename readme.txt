To run this app as a server on your laptop, you only need to copy over 4 files to any folder on that machine:

grid_maker.html (The main interface)

app.js
 (The generator logic)

style.css
 (The design/styling)
grid.ico (The icon file)




Put those 4 files in a folder (e.g., C:\Mandala).
Open Command Prompt on that laptop.
Type: cd C:\Mandala
Type: python -m http.server 8080
Now, on any other device (like your iPad), you can access it via the laptop's IP or name as we discussed.

 http://localhost:8080/grid_maker.html                   -- onlocal server


What to type on the iPad instead:
You have two better options:

Option A: Using the IP Address (Reliable)
First, find your PC's IP address (press Win + R, type cmd, then type ipconfig). Look for "IPv4 Address" 
(it usually looks like 192.168.1.XX).

iPad Link: http://192.168.1.XX:8080/grid_maker.html
Option B: Using the Device Name (Easiest)
If your laptop's name is MY-LAPTOP, you can usually just type:

What to type on the iPad instead:
You have two better options:

Option A: Using the IP Address (Reliable)
First, find your PC's IP address (press Win + R, type cmd, then type ipconfig). Look for "IPv4 Address" 
(it usually looks like 192.168.1.XX).

iPad Link: http://192.168.1.XX:8080/grid_maker.html
Option B: Using the Device Name (Easiest)
If your laptop's name is MY-LAPTOP, you can usually just type:

iPad Link: http://MY-LAPTOP.local:8080/grid_maker.html

The first time you run the Python command, Windows might pop up a window asking "Allow this app to 
communicate on private networks?" — You must click Yes/Allow, or the iPad won't be able to see it.