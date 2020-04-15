const fallbackData = [
      {"image":"nba","url":"2020/05/nba-recordigami","hed":"NBA Recordigami"},
      {"image":"nba","url":"2020/05/nba-random-walk","hed":"NBA Random Walk"},
      {"image":"wnba","url":"2020/05/wnba-recordigami","hed":"WNBA Recordigami"},
      {"image":"wnba","url":"2020/05/wnba-random-walk","hed":"WNBA Random Walk"},
    ]

let storyData = null;

function loadJS(src, cb) {
  const ref = document.getElementsByTagName("script")[0];
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  ref.parentNode.insertBefore(script, ref);

  if (cb && typeof cb === "function") {
    script.onload = cb;
  }

  return script;
}

function loadStories(cb) {
  const request = new XMLHttpRequest();
  const v = Date.now();
  const url = `http://wanderwhim.com/assets/data/stories.json?v=${v}`;
  request.open("GET", url, true);

  request.onload = () => {
    if (request.status >= 200 && request.status < 400) {
      const data = JSON.parse(request.responseText);
      cb(data);
    } else cb(fallbackData);
  };

  request.onerror = () => cb(fallbackData);

  request.send();
}

function createLink(d) {
  return `
	<a class='footer-recirc__article' href='http://wanderwhim.com/${d.url}' target='_blank' rel='noopener'>
		<img class='article__img' src='./../assets/images/${d.image}.png' alt='${d.hed}'>
		<p class='article__headline'>${d.hed}</p>
	</a>
	`;
}

function recircHTML() {
  const url = window.location.href;
  const html = storyData
    .filter(d => !url.includes(d.url))
    .slice(0, 4)
    .map(createLink)
    .join("");

  d3.select(".wanderwhim-footer .footer-recirc__articles").html(html);
}

function init() {
  storyData = [
    {"image":"wnba","url":"2020/05/wnba-recordigami","hed":"NBA Recordigami"},
    {"image":"wnba","url":"2020/05/wnba-random-walk","hed":"NBA Random Walk"},
    {"image":"wnba","url":"2020/05/wnba-recordigami","hed":"WNBA Recordigami"},
    {"image":"wnba","url":"2020/05/wnba-random-walk","hed":"WNBA Random Walk"},
  ];
  recircHTML();
}

export default { init };
