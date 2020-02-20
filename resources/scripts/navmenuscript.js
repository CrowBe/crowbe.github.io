const menuButton = document.querySelector(".dropdown-button");
const menuContainer = document.querySelector(".dropdown-container")

const clickHandler = (e) => {
    menuContainer.classList.toggle("clicked")
};

menuButton.addEventListener('click', clickHandler);