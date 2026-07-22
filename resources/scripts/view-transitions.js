/*
 * Cross-document (multi-page) view transitions — directional typing.
 *
 * The opt-in itself lives in CSS (`@view-transition { navigation: auto }`
 * in index.css), which is the standardized replacement for the old
 * `<meta name="view-transition">` tag. This script only adds *direction*:
 * for each same-origin navigation it works out whether the visitor is
 * moving "deeper" into the site or back out, and tags the active view
 * transition with a `forwards` / `backwards` / `sideways` type. CSS reads
 * those types via `:root:active-view-transition-type(...)` and slides the
 * page the matching way.
 *
 * Progressive enhancement: browsers without the Navigation API or the
 * pageswap/pagereveal events simply never run this, and the navigation
 * falls back to the CSS cross-fade (or an instant load on older browsers).
 */
(function () {
  "use strict";

  // Bail early where the cross-document plumbing isn't available.
  if (typeof window.navigation === "undefined") return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Site depth: home (0) → writing index (1) → an article (2).
  function depthOf(pathname) {
    if (pathname === "/writing/" || pathname === "/writing/index.html") return 1;
    if (/^\/writing\/[^/]+\.html$/.test(pathname)) return 2; // any article file
    return 0; // home and everything else
  }

  function directionType(fromPath, toPath) {
    var delta = depthOf(toPath) - depthOf(fromPath);
    if (delta > 0) return "forwards";
    if (delta < 0) return "backwards";
    return "sideways"; // same depth → keep the plain cross-fade
  }

  function pathOf(url) {
    try {
      return new URL(url, location.href).pathname;
    } catch (e) {
      return null;
    }
  }

  // Outgoing page: tag the transition just before this document is swapped out.
  window.addEventListener("pageswap", function (event) {
    if (!event.viewTransition || reduceMotion.matches) return;
    var activation = event.activation;
    var toPath = activation && activation.entry ? pathOf(activation.entry.url) : null;
    if (!toPath) return;
    event.viewTransition.types.add(directionType(location.pathname, toPath));
  });

  // Incoming page: tag the transition before its first render.
  window.addEventListener("pagereveal", function (event) {
    if (!event.viewTransition || reduceMotion.matches) return;
    var activation = window.navigation.activation;
    var fromPath = activation && activation.from ? pathOf(activation.from.url) : null;
    if (!fromPath) return;
    event.viewTransition.types.add(directionType(fromPath, location.pathname));
  });
})();
