(function () {
  // state
  let todayAsformattedDate;
  let todaysMatch;

  let slides;
  let currentSlide = 0;
  let rotationTime = 15;
  let matchUrls = [];
  let matches = [];
  let sponsors = [];
  let logos = [];
  let tsvScorers = [];
  let slideshowInterval;

  const setStyles = (el, styles) => Object.assign(el.style, styles);

  const createSlide = ({
    id,
    classList = [],
    backgroundClass,
    styles = {},
  } = {}) => {
    const slide = document.createElement("div");
    slide.classList.add("slide");
    if (backgroundClass) slide.classList.add(backgroundClass);
    classList.forEach((c) => slide.classList.add(c));
    if (id) slide.id = id;
    setStyles(slide, styles);
    return slide;
  };

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Fetch failed (${res.status}) ${url}`);
    return res.json();
  };

  const fetchBlob = async (url, options = {}) => {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Fetch failed (${res.status}) ${url}`);
    return res.blob();
  };

  // helpers
  const createGoalColumn = (marginProp, marginValue) => {
    const col = document.createElement("div");
    setStyles(col, {
      display: "inline-block",
      width: "48%",
      textAlign: "left",
      height: "65%",
      verticalAlign: "top",
    });
    col.style[marginProp] = marginValue;
    return col;
  };

  function nextSlide() {
    slides[currentSlide].classList.remove("active");
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add("active");
  }

  function prevSlide() {
    slides[currentSlide].classList.remove("active");
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    slides[currentSlide].classList.add("active");
  }

  function startSlideshow() {
    slides = document.querySelectorAll(".slide");
    if (slides.length === 0) return;

    slides.forEach((s) => s.classList.remove("active"));
    currentSlide = 0;
    slides[0].classList.add("active");
    slideshowInterval = setInterval(nextSlide, rotationTime * 1000);
  }

  function pauseSlideshow() {
    if (slideshowInterval) {
      clearInterval(slideshowInterval);
      slideshowInterval = null;
    }
  }

  function resumeSlideshow() {
    if (!slideshowInterval) {
      slideshowInterval = setInterval(nextSlide, rotationTime * 1000);
    }
  }

  function restartSlideshow() {
    pauseSlideshow();
    slides = document.querySelectorAll(".slide");
    if (slides.length === 0) return;

    slides.forEach((s) => s.classList.remove("active"));
    currentSlide = 0;
    slides[0].classList.add("active");
    slideshowInterval = setInterval(nextSlide, rotationTime * 1000);
  }

  function setGreeting() {
    const greetingText = document.getElementById("greetingtext");
    const opponentText = document.getElementById("opponent");
    const opponentLogo = document.getElementById("opponentLogo");

    const todaysMatch = matches.find(
      (m) => m.formattedDate === todayAsformattedDate,
    );

    const nextHomeMatch = matches
      .sort((a, b) => a.formattedDate - b.formattedDate)
      .find(
        (m) =>
          m.formattedDate > todayAsformattedDate &&
          m.homeTeam === "TSV Bad Griesbach",
      );

    const match = todaysMatch || nextHomeMatch;

    if (match) {
      greetingText.innerText =
        "Wir begrüßen zum heutigen Heimspiel herzlich den";
      opponentText.innerText = match.awayTeam;
      let awayTeamLogo = getLogoForTeam(match.awayTeamSlug);
      opponentLogo.src =
        awayTeamLogo == null
          ? match.awayTeamImg.replace("200x200", "300x300")
          : awayTeamLogo;
    }
  }

  async function getBestScorers() {
    const url = "https://www.fupa.net/league/a-klasse-pocking/scorers";
    const bestscorersDiv = document.getElementById("bestscorersDiv");
    if (bestscorersDiv.children.length === 0) {
      try {
        const blob = await fetchBlob("/api/scorers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const img = document.createElement("img");
        img.src = URL.createObjectURL(blob);
        bestscorersDiv.appendChild(img);
      } catch (error) {
        console.error("Fehler beim Laden der Torschützen:", error);
      }
    }
  }

  async function getBestTsvScorers() {
    const url = "https://www.fupa.net/team/tsv-bad-griesbach-m1-2025-26";
    if (tsvScorers.length === 0) {
      try {
        tsvScorers = await fetchJson("/api/scorers/tsv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        createTsvScorerPage();
        await getBestScorers();
      } catch (error) {
        console.error("Fehler beim Laden der TSV-Torschützen:", error);
      }
    }
  }

  async function getMatchData() {
    const delay = 5000; // Konstante für die Verzögerung
    while (matches.length < matchUrls.length) {
      try {
        const response = await fetch("/api/matches", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        matches = await response.json();
      } catch (error) {
        console.error("Fehler:", error);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    if (matchUrls.length == matches.length) {
      setGreeting();
      createMatchPages();
      setTimeout(startSlideshow, 5000);
      console.log("getMatchData fertig");
    }
  }

  function getAllMatchDetails(urls) {
    if (matches.length == 0) {
      fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: urls }),
      }).catch((error) => {
        console.error("Fehler:", error);
      });
    }
  }

  function updateData() {
    let dateTime = new Date();
    todayAsformattedDate = formatDate(dateTime);
    console.log("todayAsformattedDate: " + todayAsformattedDate);
    getAllMatchUrls();
  }

  function parseMatchDate(rawHref) {
    const trimmed = rawHref.split("?")[0];

    const datePart = trimmed.split("-").pop();
    if (!datePart) return null;

    let year, month, day;
    if (datePart.length === 6) {
      year = 2000 + parseInt(datePart.slice(0, 2), 10);
      month = parseInt(datePart.slice(2, 4), 10) - 1;
      day = parseInt(datePart.slice(4, 6), 10);
    } else if (datePart.length === 8) {
      year = parseInt(datePart.slice(0, 4), 10);
      month = parseInt(datePart.slice(4, 6), 10) - 1;
      day = parseInt(datePart.slice(6, 8), 10);
    } else {
      return null;
    }

    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getAllMatchUrls() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const linkElements = Array.from(
      document.querySelectorAll('a[href*="/match/"]'),
    );

    const matchEntries = linkElements
      .map((link) => {
        const href = link.getAttribute("href");
        const date = parseMatchDate(href);
        return date ? { href: href.split("?")[0], date } : null;
      })
      .filter(Boolean);

    const pastMatches = matchEntries
      .filter((entry) => entry.date <= today)
      .sort((a, b) => a.date - b.date);

    const futureMatches = matchEntries
      .filter((entry) => entry.date > today)
      .sort((a, b) => a.date - b.date);

    const nextMatch = futureMatches.length ? futureMatches[0].href : null;

    matchUrls = [
      ...new Set([
        ...pastMatches.map((e) => e.href),
        ...(nextMatch ? [nextMatch] : []),
      ]),
    ];

    if (matchUrls.length > 0) {
      console.log("matchUrls: ", matchUrls);
      getAllMatchDetails(matchUrls);
      setTimeout(getMatchData, 5000);
    }
  }

  function formatDate(dateToFormat) {
    return (
      dateToFormat.getFullYear().toString().slice(-2) +
      (dateToFormat.getMonth() + 1 < 10 ? "0" : "") +
      (dateToFormat.getMonth() + 1).toString() +
      (dateToFormat.getDate() < 10 ? "0" : "") +
      dateToFormat.getDate().toString()
    );
  }

  function createTsvScorerPage() {
    const tsvscorersDiv = document.getElementById("tsvscorers");

    const title = document.createElement("p");
    setStyles(title, {
      textAlign: "center",
      color: "white",
      fontSize: "60px",
    });
    title.textContent = "Beste TSV Torschützen";
    tsvscorersDiv.appendChild(title);

    tsvScorers.sort((a, b) =>
      a.goals === b.goals ? a.matches - b.matches : b.goals - a.goals,
    );

    tsvScorers.splice(5);
    const percentage = 100 / tsvScorers.length;

    for (const tsvScorer of tsvScorers) {
      const newDiv = document.createElement("div");
      setStyles(newDiv, {
        float: "left",
        width: `${percentage}%`,
        textAlign: "center",
      });

      const img = document.createElement("img");
      img.src = tsvScorer.img;
      img.alt = tsvScorer.name;
      setStyles(img, {
        top: "50%",
      });

      const pGoals = document.createElement("p");
      setStyles(pGoals, {
        color: "#FFFFFF",
        fontSize: "60px",
      });
      pGoals.textContent = `${tsvScorer.goals}x`;

      const pName = document.createElement("p");
      setStyles(pName, {
        backgroundColor: "white",
        color: "red",
        fontSize: "40px",
      });
      pName.textContent = tsvScorer.name;

      newDiv.append(pGoals, img, pName);
      tsvscorersDiv.appendChild(newDiv);
    }
  }

  function getLogoForTeam(team) {
    let logo = null;
    for (const logoItem of logos) {
      const logoWithoutEnding = logoItem.split(".")[0];
      if (logoWithoutEnding === team) {
        logo = "logo/" + logoItem;
        break;
      }
    }
    return logo;
  }

  function createTeamLogo(match, isHome) {
    const teamId = isHome ? match.homeTeamId : match.awayTeamId;
    const teamName = isHome ? match.homeTeam : match.awayTeam;
    const teamSlug = isHome ? match.homeTeamSlug : match.awayTeamSlug;
    const teamImg = isHome ? match.homeTeamImg : match.awayTeamImg;

    const teamDiv = document.createElement("div");
    setStyles(teamDiv, {
      position: "absolute",
      top: "15",
      width: "15%",
      transform: "translateY(-50%)",
    });

    if (isHome) {
      teamDiv.style.left = "5%";
    } else {
      teamDiv.style.right = "5%";
    }

    const img = document.createElement("img");
    const localLogo = getLogoForTeam(teamSlug);
    img.src = localLogo == null ? teamImg : localLogo;
    img.alt = teamName;
    img.style.width = "100%";
    img.style.height = "auto";

    teamDiv.appendChild(img);
    return teamDiv;
  }

  function createMatchScore(match) {
    const homegoals = match.goals.filter(
      (x) => x.team === match.homeTeamId,
    ).length;
    const awaygoals = match.goals.filter(
      (x) => x.team === match.awayTeamId,
    ).length;

    const score = document.createElement("p");
    setStyles(score, {
      position: "absolute",
      top: "10%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      textAlign: "center",
      color: "white",
      fontSize: "150px",
    });

    if (match.verdict === "") {
      score.textContent = `${homegoals}:${awaygoals}`;
    } else if (match.verdict == "Nichtantritt GAST") {
      score.textContent = "X:0";
    } else {
      score.textContent = "0:X";
    }

    return score;
  }

  function createGoalSection(match) {
    const goalscorers = document.createElement("div");
    setStyles(goalscorers, {
      position: "absolute",
      left: "50%",
      top: "60%",
      transform: "translate(-50%, -50%)",
      width: "60%",
      height: "50%",
    });

    const homeCol = createGoalColumn("marginRight", "2%");
    const awayCol = createGoalColumn("marginLeft", "2%");

    match.goals
      .slice()
      .sort((a, b) => {
        if (a.minute === b.minute)
          return a.additionalMinute - b.additionalMinute;
        return a.minute - b.minute;
      })
      .forEach((goal) => {
        const entry = document.createElement("p");
        const playerText = document.createElement("span");
        playerText.textContent =
          goal.player + (goal.goalType == "goal_own_goal" ? " (ET) " : "");
        const minuteText = document.createElement("span");
        minuteText.textContent = goal.minute + "'";
        minuteText.style.float = "right";

        entry.appendChild(playerText);
        entry.appendChild(minuteText);

        setStyles(entry, {
          color: "white",
          fontSize: "30px",
          display: "block",
          textAlign: "left",
        });

        const empty = document.createElement("p");
        empty.innerHTML = "<br>";

        if (goal.team === match.homeTeamId) {
          homeCol.appendChild(entry);
          awayCol.appendChild(empty);
        } else {
          awayCol.appendChild(entry);
          homeCol.appendChild(empty);
        }
      });

    goalscorers.appendChild(homeCol);
    goalscorers.appendChild(awayCol);
    return goalscorers;
  }

  function createMatchSlide(match) {
    const slide = createSlide({ backgroundClass: "bg-match" });

    const title = document.createElement("p");
    setStyles(title, {
      textAlign: "center",
      color: "white",
      fontSize: "60px",
    });
    title.textContent = `${match.matchDay} ${match.league}`;

    slide.append(
      title,
      createTeamLogo(match, true),
      createTeamLogo(match, false),
      createMatchScore(match),
      createGoalSection(match),
    );

    return slide;
  }

  function createMatchPages() {
    const tsvscorersDiv = document.getElementById("tsvscorers");

    matches.sort((a, b) => Number(a.formattedDate) - Number(b.formattedDate));

    matches
      .filter(
        (match) =>
          match.formattedDate !== todayAsformattedDate &&
          match.formattedDate < todayAsformattedDate,
      )
      .forEach((match) => {
        const slide = createMatchSlide(match);
        tsvscorersDiv.parentElement.insertBefore(slide, tsvscorersDiv);
      });

    slides = document.querySelectorAll(".slide");
  }

  async function getLogos() {
    try {
      logos = await fetchJson("/api/logos");
    } catch (error) {
      console.error("Fehler beim Laden der Logos:", error);
    }
  }

  async function createSponsorPages() {
    const afterSponsorsDiv = document.getElementById("afterSponsors");

    try {
      sponsors = await fetchJson("/api/sponsors");

      for (const sponsor of sponsors) {
        const newDiv = document.createElement("div");
        setStyles(newDiv, {
          position: "absolute",
          top: "0",
          left: "0",
          height: "100vh",
          width: "100vw",
          textAlign: "center",
          backgroundImage: "url('background/sponsor.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        });
        newDiv.className = "slide";

        const img = document.createElement("img");
        img.src = `sponsor/${sponsor}`;
        img.alt = "sponsor";
        setStyles(img, {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        });

        newDiv.appendChild(img);
        afterSponsorsDiv.parentElement.insertBefore(newDiv, afterSponsorsDiv);
      }

      slides = document.querySelectorAll(".slide");
    } catch (error) {
      console.error("Fehler beim Laden der Sponsoren:", error);
    }
  }

  async function init() {
    slides = document.querySelectorAll(".slide");

    await createSponsorPages();
    await getLogos();
    await getBestTsvScorers();

    setTimeout(updateData, 12000);

    document.addEventListener("keydown", function (event) {
      if (event.code === "Space") {
        event.preventDefault();
        if (slideshowInterval) {
          pauseSlideshow();
        } else {
          resumeSlideshow();
        }
      } else if (event.code === "Enter") {
        event.preventDefault();
        restartSlideshow();
      }
    });
  }

  function start() {
    init().catch((error) => console.error("Init error:", error));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
