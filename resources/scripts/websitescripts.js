// Script to smooth scroll between anchor tags

/*
Function that checks the url, isolates the relevant node and uses the
scrollIntoView api to smooth scroll to the appropriate section.
*/
const anchorScroller = (e) => {
    const { hash } = window.location;
    if (hash) {
      let node = document.getElementsByName(hash.replace('#', ''));
      if (node.length > 0) {
          node[0].scrollIntoView({
            block: "start",
            behavior: "smooth"
          });
      }
    }
}

// Add an event listener that fires my scroller function when the url changes
window.addEventListener('hashchange', anchorScroller);



// Animation script for landing section background

// Target the animation container
const boxArea = document.getElementById("animation-area");

// Function to randomly generate a whole number in a given range
const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}


/*
Function that assigns the randomly generated numbers to named css variables
controlling key elements of the background animation
*/
const setCssVariables = (box) => {
    let duration = getRandomInt(5, 20);
    box.style.setProperty('--animation-duration', duration +'s');
    let delay = getRandomInt(0, 8);
    box.style.setProperty('--animation-delay', delay +'s');
    let size = getRandomInt(15, 100);
    box.style.setProperty('--box-size', size +'px');
    let position = getRandomInt(5, 75);
    box.style.setProperty('--box-position', position +'%');
}

/*
Event handler that removes a box once it has completed it's animation
and then adds another box with newly generated properties.
*/
boxUpdater = (event) => {
    let { target } = event;
    target.parentNode.removeChild(target);
    newBox();
}

/*
Calls all of the above functions to create an animated box and add the event listener.
Fortunately JavaScript lets me call it in the previous function before definition
*/
const newBox = () => {
    let box = document.createElement("LI");
    setCssVariables(box);
    boxArea.appendChild(box);
    box.addEventListener('animationend', boxUpdater)
}

/*
Initiate the animation by creating 10 boxes using the newBox function.
The function will assign each random size, speed and delay.
*/
for (let i = 0; i < 10; i++) {
    newBox();
}



// Script to control the animation/transition of the navigation menu

// target and store the button that triggers the animation
const menuButton = document.querySelector(".dropdown-button");
// target and store the container that will be revealed on animation
const menuContainer = document.querySelector(".dropdown-container")


// Function that toggles the css class that contains the transition sequence
const navRevealHandler = (e) => {
    // Using toggle here allows for the transition to occur both directions
    menuContainer.classList.toggle("clicked")
};

// Add an event listener that fires the toggler on click
menuButton.addEventListener('click', navRevealHandler);


// Script to toggle between button and project description

// Target all project description containers
const containers = document.getElementsByClassName("project-description-container");

/*
Function to toggle the revealed class.
Targets the button and description simultaneously toggling a revealed class
*/
const revealHandler = (e) => {
    const { target } = e;
    /*
    First condition triggers if the button was directly clicked
    Second condition triggers if the description is revealed and toggles the reverse
    Else captures a click elsewhere on the container and thus targets differently
    */
    if (target.tagName === "BUTTON") {
        e.target.parentNode.firstElementChild.classList.toggle("revealed");
        e.target.parentNode.lastElementChild.classList.toggle("revealed");
    } else if (target.tagName === "P") {
        target.parentNode.firstElementChild.classList.toggle("revealed");
        target.parentNode.lastElementChild.classList.toggle("revealed");
    } else {
        e.target.firstElementChild.classList.toggle("revealed");
        e.target.lastElementChild.classList.toggle("revealed");
    }
}

/* 
Add event listeners to the containers. An alternative is to bind separate
event listeners to the button and the description but this is probably 
more difficult with the current method of revealing/hiding.
*/
for (let container of containers) {
    container.addEventListener('click', revealHandler);
}



// Script to control the animation of the skill indicator bar

/* 
Function that will be used to create an Intersection Observer.
It targets the area to be animated and will be handed a callback that
triggers the animation.
*/
const createObserver = (callback) => {
    let observer;
    const container = document.querySelector('.skills-graph-container');

    /*
    root is given a null value to assign it to the viewport by default.
    threshold defines how much of the observed object must intersect to trigger the callback.
    0 triggers at first intersection and 1 will trigger when the object is
    fully within the root area. Thus 0.6 waits for 60% of the object to be visible.
    */
    let options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.6
    };
  
    observer = new IntersectionObserver(callback, options);
    observer.observe(container);
}

// Target the html text containing the percentages listed next to each skill
const pcts = document.getElementsByClassName("skills-graph-number");
// Target the indicator bars for each skill
const indicators = document.getElementsByClassName("skills-graph-indicator");

/* 
Function that triggers the animation. An if condition is used to ignore the initial
entry that occurs upon load and returns an intersectionRatio of 0
*/
const handleIntersect = (entries, observer) => { 
    entries.forEach(entry => {
      if (entry.intersectionRatio > 0.6) {
        // Loop through for each skills bar
        for (let i = 0; i < pcts.length; i++) {
            // Isolate an index from the html string containing the percentage
            const numberPattern = /\d+/g;
            let pct = Number(pcts[i].innerHTML.match(numberPattern));
            // Use that number to set the css variable that controls the indicator width
            indicators[i].firstChild.style.setProperty('--skill-width', pct +'%');
        }
      }
    });
};

// Hand the above function to the Intersection Observer as a callback
createObserver(handleIntersect);