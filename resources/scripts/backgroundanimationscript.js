// Target the animation container
const boxArea = document.getElementById("animation-area");

// Function to randomly generate a whole number in a given range
const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}


// Function to assign the randomly generated numbers to named css variables
//  controlling key elements of the background animation
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

// Event handler that removes a box once it has completed it's animation
// and then adds another box with newly generated properties.
boxUpdater = (event) => {
    let { target } = event;
    target.parentNode.removeChild(target);
    newBox();
}

// Calls all of the above functions to create an animated box and add the event listener.
// Fortunately JavaScript lets me call it in the previous function before definition
const newBox = () => {
    let box = document.createElement("LI");
    setCssVariables(box);
    boxArea.appendChild(box);
    box.addEventListener('animationend', boxUpdater)
}

for (let i = 0; i < 10; i++) {
    newBox();
}