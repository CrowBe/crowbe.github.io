const pcts = document.getElementsByClassName("skills-graph-number");
const indicators = document.getElementsByClassName("skills-graph-indicator");

let options = {
    root: document.querySelector('#scrollArea'),
    rootMargin: '0px',
    threshold: 1.0
}

function createObserver(callback) {
    let observer;
    let container = document.querySelector('.skills-graph-container');
  
    let options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.8
    };
  
    observer = new IntersectionObserver(callback, options);
    observer.observe(container);
}

const handleIntersect = (entries, observer) => { 
    entries.forEach(entry => {
      if (entry.intersectionRatio > 0.8) {
        for (let i = 0; i < pcts.length; i++) {
            const numberPattern = /\d+/g;
            let pct = Number(pcts[i].innerHTML.match(numberPattern));
            indicators[i].firstChild.style.setProperty('--skill-width', pct +'%');
        }
      }
    });
};

createObserver(handleIntersect);