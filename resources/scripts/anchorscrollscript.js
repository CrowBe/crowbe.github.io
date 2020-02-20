const anchorScroller = (e) => {
    const { hash } = window.location;
    console.log("clicked" + hash)
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

window.addEventListener('hashchange', anchorScroller)