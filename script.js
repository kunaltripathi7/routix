'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration;
    return this.speed;
  }
}

const run1 = new Running([59, -12], 13, 2, 133);
// console.log(run1);

///// APP Functionality
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #zoomlvl = 13;
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    // forms default behaviour reloads the page
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('click', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    // navigator obj. is the prpty of window obj.
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert("Location can't be fetched");
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords; // use destructuring always when taking things out the obj.
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#zoomlvl); // pass the html ele id inside, L is a global variable inside the script of leaflet, all the global variables in a script can be accessed in other scripts which are loaded after them of course. 2nd arg is zoom lvl. storing the map created cuz setview would be returning and obj on which we can diff meths.
    // console.log(map);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // adding an event listener but using leaflet
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      // after loading the map
      this._renderWorkoutMarker(work);
    });
  }

  _setLocalStorage() {
    // simple api, blocking(bad) || KV pairs boths strings
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    // map hasn't yet been loaded and we are trying to add marker to it hence undefined || async
    // workout.click doesn't works / lost the prtype chain of objects when got from local strg
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _newWorkout(e) {
    e.preventDefault();
    const checkFinite = (...input) => input.every(inp => Number.isFinite(inp));
    const checkPositive = (...input) => input.every(inp => inp > 0);
    // input data
    const type = inputType.value;
    const duration = +inputDuration.value; // Convert to numbers
    const distance = +inputDistance.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if running -> // why checking individually?? cuz no method to know if its cadence or elevation
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !checkFinite(duration, distance, cadence) ||
        !checkPositive(duration, distance, cadence)
      )
        return alert('Please enter valid numbers');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !checkFinite(duration, distance, elevation) ||
        !checkPositive(duration, distance)
      )
        return alert('Please enter valid numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // add to workouts
    this.#workouts.push(workout);
    // render workout
    this._renderWorkoutMarker(workout);
    // render list
    this._renderWorkout(workout);
    //hideform
    this._hideForm();
    // pushing it to local storage
    this._setLocalStorage();
  }

  _renderWorkout(workout) {
    // recognize for setting the desc. if we would calc the logic here it would have made our code messy and a particular func. should deal with only that specific task so we created a func. on the workout class. // DRY to the fullest, Why?? desc. is used in marker func. as well so before adding a logic figure out if it would be used in some other place.
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                  <span class="workout__icon">${
                    workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                  }</span>
                  <span class="workout__value">${workout.distance}</span>
                  <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                  <span class="workout__icon">⏱</span>
                  <span class="workout__value">${workout.duration}</span>
                  <span class="workout__unit">min</span>
                </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
                  <span class="workout__icon">⚡️</span>
                  <span class="workout__value">${workout.cadence}</span>
                  <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                  <span class="workout__icon">🦶🏼</span>
                  <span class="workout__value">${workout.pace.toFixed(1)}</span>
                  <span class="workout__unit">spm</span>
                </div>
              </li>`;
    }
    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _renderWorkoutMarker(workout) {
    // L.marker([lat, lng])
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          // Read the documentation for understanding behind the scenes.
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`, // type can't be accessed so rather than passing in args add it to the class property
        })
      )
      .setPopupContent('Workout') // returns this so chain
      .openPopup();
  }

  _showForm(mapE) {
    // for using an arg anywhere else create a global var for that.
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    // console.log(mapEvent);
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden'); // closest thing doing cuz need to deal with div not the label this is the viable way cuz all the divs have the same classes so another way could be selecting both the divs seperately and toggling them.
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _moveToPopup(e) {
    // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
    if (!this.#map) return;
    // event delegation cuz the ele on which eh has to be attached isn't present in the start
    const ele = e.target.closest('.workout');
    if (!ele) return;
    const workout = this.#workouts.find(wt => ele.dataset.id === wt.id);
    // console.log(ele);
    this.#map.setView(workout.coords, this.#zoomlvl, {
      //bad practice to repeat hardcode no's so made a prrpty
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // using public interface
    // workout.click();
  }

  reset() {
    // public interface is just public props and meths
    localStorage.removeItem('workouts');
    location.reload(); // reloading the page
  }
}

const app = new App();

// arch -> for more complex proj we could have divided the architecture into business and data logic. (Business logic dealing with underlying data)
// Get the arch from the slides then shift all event listeners to the const and make every callback a seperate func. Bind the this keyword while calling the callback as adding eventListener makes this point to the dom ele on which it was called.
// While creating arch focus on creating a new parent class if they have something in common.
// Architecture is How to implement it & flowchart is what to implement (make flowchart high level).
// Breaking down to the smallest steps..... -> How to write code?? Seeing the flowchart a series of events -> just comment down small points in the code and implement
