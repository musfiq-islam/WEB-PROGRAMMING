// locations.js — location suggestions for pickup / destination fields.
// Any <input data-location> gets a dropdown of matching places while typing.
// Users can still type any place that is not in the list.
//
// Rule: every trip has exactly one UIU end. If one field is a UIU location
// (UIU Campus / Gate 1 / Gate 2) the other field only suggests non-UIU
// places; if one field is anywhere else, the other only suggests UIU places.

const LOCATION_SUGGESTIONS = ["UIU Campus", "UIU Campus Gate 1", "UIU Campus Gate 2", "Madani Avenue", "Badda", "Natun Bazar", "Vatara", "Gulshan 1", "Gulshan 2", "Banani", "Baridhara", "Mohakhali", "Bashundhara R/A", "Notun Bazar", "Rampura", "Banasree", "Malibagh", "Moghbazar", "Shantinagar", "Kakrail", "Motijheel", "Paltan", "Gulistan", "Sadarghat", "Old Dhaka", "Kamalapur", "Khilgaon", "Mugda", "Basabo", "Sayedabad", "Jatrabari", "Demra", "Uttara", "Uttara Sector 3", "Uttara Sector 10", "Airport", "Kuril", "Khilkhet", "Nikunja", "Tejgaon", "Farmgate", "Karwan Bazar", "Shahbag", "Dhaka University", "Nilkhet", "New Market", "Dhanmondi", "Dhanmondi 27", "Science Lab", "Kalabagan", "Elephant Road", "Mohammadpur", "Adabor", "Shyamoli", "Technical", "Mirpur 1", "Mirpur 2", "Mirpur 10", "Mirpur 11", "Mirpur 12", "Mirpur 14", "Pallabi", "Kazipara", "Shewrapara", "Agargaon", "Gabtoli", "Savar", "Ashulia", "Narayanganj", "Gazipur", "Tongi", "Keraniganj", "Wari", "Lalbagh", "Hazaribagh", "Kamrangirchar", "Jigatola", "Ramna", "Eskaton", "Hatirjheel", "Panthapath", "Bijoynagar", "Kawran Bazar", "Cantonment", "Mohakhali DOHS", "Mirpur DOHS", "Niketan", "Tongi Station Road", "Hemayetpur", "Bosila", "Kallyanpur", "Rayer Bazar"];


function isUiuLocation(value) {
  return /\buiu\b/i.test(value || "");
}

const UIU_LOCATIONS = LOCATION_SUGGESTIONS.filter(isUiuLocation);
const OTHER_LOCATIONS = LOCATION_SUGGESTIONS.filter((p) => !isUiuLocation(p));

/** Returns an error message if the pickup/destination pair breaks the UIU rule, else "". */
function uiuPairError(pickup, destination) {
  const p = (pickup || "").trim();
  const d = (destination || "").trim();
  if (!p || !d) return "";
  if (isUiuLocation(p) && isUiuLocation(d)) {
    return "Pickup and destination can't both be UIU. Choose a different place for one of them.";
  }
  if (!isUiuLocation(p) && !isUiuLocation(d)) {
    return "One of pickup or destination must be UIU Campus (Gate 1 / Gate 2).";
  }
  return "";
}

function ensureDatalist(id, items) {
  let list = document.getElementById(id);
  if (!list) {
    list = document.createElement("datalist");
    list.id = id;
    list.innerHTML = items.map((p) => `<option value="${p}"></option>`).join("");
    document.body.appendChild(list);
  }
}

function attachLocationSuggestions(root) {
  ensureDatalist("location-suggestions", LOCATION_SUGGESTIONS);
  ensureDatalist("location-suggestions-uiu", UIU_LOCATIONS);
  ensureDatalist("location-suggestions-other", OTHER_LOCATIONS);

  const scope = root || document;
  const pickup = scope.querySelector("#pickup[data-location]");
  const destination = scope.querySelector("#destination[data-location]");

  scope.querySelectorAll("input[data-location]").forEach((input) => {
    input.setAttribute("list", "location-suggestions");
    input.setAttribute("autocomplete", "off");
  });
  if (!pickup || !destination) return;

  // Point each field at the list that complements the other field's value.
  function listFor(otherValue) {
    const v = (otherValue || "").trim();
    if (!v) return "location-suggestions";
    return isUiuLocation(v) ? "location-suggestions-other" : "location-suggestions-uiu";
  }
  function sync() {
    destination.setAttribute("list", listFor(pickup.value));
    pickup.setAttribute("list", listFor(destination.value));
  }
  [pickup, destination].forEach((el) => {
    el.addEventListener("input", sync);
    el.addEventListener("change", sync);
  });
  sync();
}
document.addEventListener("DOMContentLoaded", () => attachLocationSuggestions());
