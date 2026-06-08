(function () {
  function sendEvent(eventName, params) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", eventName, {
      page_path: window.location.pathname,
      transport_type: "beacon",
      ...params,
    });
  }

  function toolNameFromHref(href) {
    if (href.includes("hypotheekcalculator")) return "hypotheekcalculator";
    if (href.includes("woonlastencalculator")) return "woonlastencalculator";
    if (href.includes("verkoopopbrengst")) return "verkoopopbrengstcalculator";
    if (href.includes("brandstofkosten")) return "brandstofkostencalculator";
    return "website";
  }

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a");
    if (!link || !link.href) return;

    const href = link.href;
    if (href.includes("ko-fi.com/rekenhulpje")) {
      sendEvent("support_click", {
        link_url: href,
        link_text: link.textContent.trim(),
      });
      return;
    }

    if (href.includes("instagram.com/rekenhulpje.nl")) {
      sendEvent("social_click", {
        link_url: href,
        link_text: link.textContent.trim(),
        social_platform: "instagram",
      });
      return;
    }

    if (link.origin === window.location.origin && href.includes("calculator")) {
      sendEvent("internal_tool_click", {
        link_url: href,
        link_text: link.textContent.trim(),
        target_tool: toolNameFromHref(href),
      });
    }
  });
})();
