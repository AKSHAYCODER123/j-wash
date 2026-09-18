# JWASH

Frontend for our college project idea - a way to track hostel laundry
instead of the usual "give bag, hope for the best" system.

Built around how laundry actually works on our campus - every student has
a fixed 4 digit Laundry ID for all 4 years, and that ID decides which 2
days a week you can drop off/pickup (sunday is off for everyone).

## What it does

- Student logs in with name, room, and their Laundry ID (e.g. 2464).
  Based on the ID it shows which 2 days are their slot (e.g. Wednesday
  & Saturday) - sunday is never a slot day.
- Student builds a "wardrobe" - upload a photo of a garment once, its
  saved so you dont have to upload it again next time.
- When submitting laundry, pick garments from your wardrobe. The order
  is tagged with your Laundry ID, no separate ticket number needed since
  your ID is already the identifier.
- Staff can log in separately and move an order through Received -> Ready
  -> Delivered.
- If something goes missing, look up the Laundry ID in Lost & Found and
  select which exact garment is missing, using the saved photo as proof.

## About the slot days

Right now which 2 days an ID gets is worked out with `id % 3` in
script.js (see `getSlotDays`), just so it's consistent and always skips
sunday. This is a placeholder - swap it for the real slot list from the
laundry office if it's different.

## Tech used

Just HTML, CSS and JS for now, no backend. Data is saved in localStorage
so it only works on the browser you used it on (not the full version yet).

## How to run it

Just open index.html in your browser. Or if you want to serve it properly:

```
python3 -m http.server 8000
```
then go to localhost:8000

## Files

- index.html - all the pages/tabs
- style.css - styling
- script.js - all the logic
- README.md - this file

## What's not done yet

- No real backend/database, everything is localStorage right now
- Login is fake, just picks a role, no actual password check
- Photos are stored as base64 in localStorage instead of on a server

Planned to add a Flask or Node backend with a proper database later, plus
real login and maybe QR codes for the tickets.

## pushing this to github

```
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin <your repo url>
git push -u origin main
```
