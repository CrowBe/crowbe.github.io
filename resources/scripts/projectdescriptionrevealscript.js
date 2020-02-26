const containers = document.getElementsByClassName("project-description-container");

const revealHandler = (e) => {
    const { target } = e;
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

for (let container of containers) {
    container.addEventListener('click', revealHandler);
}
