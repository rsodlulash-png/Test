
/*
 * Imfundo Quest
 * Loads, filters and displays lessons from the subject JSON files.
 */

"use strict";

(function () {
  // 1. The JSON files containing our lessons.
  const LESSON_FILES = [
    "data/mathematics.json",
    "data/physical-sciences.json",
    "data/life-sciences.json"
  ];

  // 2. Store lessons and the currently selected lesson.
  let allLessons = [];
  let currentLesson = null;

  // 3. Find HTML elements by their IDs.
  function byId(id) {
    return document.getElementById(id);
  }

  // 4. Escape text before inserting it into HTML.
  function escapeHTML(value) {
    if (window.IQApp && typeof window.IQApp.safe === "function") {
      return window.IQApp.safe(value);
    }

    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[char];
    });
  }

  // 5. Get the correct subject name for display.
  function subjectName(subject) {
    const names = {
      mathematics: "Mathematics",
      "physical-sciences": "Physical Sciences",
      "life-sciences": "Life Sciences"
    };

    return names[subject] || subject;
  }

  // 6. Read the learner's selected filters.
  function getFilters() {
    return {
      grade: byId("lesson-grade")?.value || "",
      subject: byId("lesson-subject")?.value || "",
      language: byId("lesson-language")?.value || "en"
    };
  }

  // 7. Use the URL subject parameter as the initial filter.
  function applyURLFilters() {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get("subject");

    const allowedSubjects = [
      "mathematics",
      "physical-sciences",
      "life-sciences"
    ];

    if (
      subject &&
      allowedSubjects.includes(subject) &&
      byId("lesson-subject")
    ) {
      byId("lesson-subject").value = subject;
    }
  }

  // 8. Filter lessons using grade, subject and language.
  function getFilteredLessons() {
    const filters = getFilters();

    return allLessons.filter(function (lesson) {
      const matchesGrade =
        !filters.grade || String(lesson.grade) === filters.grade;

      const matchesSubject =
        !filters.subject || lesson.subject === filters.subject;

      // All lessons have English content. isiXhosa is available
      // only for the fields supplied in the translations object.
      const matchesLanguage =
        filters.language !== "xh" ||
        Boolean(lesson.translations?.xh);

      return matchesGrade && matchesSubject && matchesLanguage;
    });
  }

  // 9. Display the list of lessons.
  function renderLessons() {
    const lessonList = byId("lesson-list");

    if (!lessonList) {
      return;
    }

    const lessons = getFilteredLessons();

    if (byId("lesson-result-count")) {
      byId("lesson-result-count").textContent =
        lessons.length + (lessons.length === 1 ? " lesson found" : " lessons found");
    }

    if (lessons.length === 0) {
      lessonList.innerHTML =
        '<p class="muted">No lessons match your filters. Try another grade, subject or language.</p>';
      return;
    }

    lessonList.innerHTML = lessons.map(function (lesson) {
      const translatedTitle =
        getFilters().language === "xh"
          ? lesson.translations?.xh?.title
          : null;

      const title = translatedTitle || lesson.title;

      return `
        <article class="lesson-card">
          <p class="eyebrow">
            Grade ${escapeHTML(lesson.grade)} ·
            ${escapeHTML(subjectName(lesson.subject))}
          </p>

          <h3>${escapeHTML(title)}</h3>

          <p>${escapeHTML(lesson.topic || "Learning topic")}</p>

          <p class="muted">
            ${escapeHTML(lesson.duration || 10)} minutes
          </p>

          <button
            type="button"
            class="open-lesson-button"
            data-lesson-id="${escapeHTML(lesson.id)}"
          >
            Open lesson
          </button>
        </article>
      `;
    }).join("");
  }

  // 10. Display the full content of a selected lesson.
  function openLesson(lessonId) {
    const lesson = allLessons.find(function (item) {
      return item.id === lessonId;
    });

    if (!lesson) {
      return;
    }

    currentLesson = lesson;

    const reader = byId("lesson-reader");
    const titleElement = byId("lesson-reader-title");
    const metaElement = byId("lesson-reader-meta");
    const contentElement = byId("lesson-content-body");

    const language = getFilters().language;
    const translation = language === "xh"
      ? lesson.translations?.xh
      : null;

    if (titleElement) {
      titleElement.textContent = translation?.title || lesson.title;
    }

    if (metaElement) {
      metaElement.textContent =
        "Grade " + lesson.grade +
        " · " + subjectName(lesson.subject) +
        " · " + (lesson.duration || 10) + " minutes";
    }

    if (contentElement) {
      const content = lesson.content || {};
      const sections = Array.isArray(content.sections)
        ? content.sections
        : [];

      const intro = translation?.intro || content.intro || "";

      const sectionsHTML = sections.map(function (section) {
        return `
          <section class="lesson-section">
            <h3>${escapeHTML(section.heading || "Lesson section")}</h3>
            <p>${escapeHTML(section.text || "")}</p>
          </section>
        `;
      }).join("");

      const summary = translation?.summary || content.summary || "";

      contentElement.innerHTML = `
        <section class="lesson-introduction">
          <h3>Introduction</h3>
          <p>${escapeHTML(intro)}</p>
        </section>

        ${sectionsHTML}

        ${content.example ? `
          <section class="lesson-example">
            <h3>Example</h3>
            <p>${escapeHTML(content.example)}</p>
          </section>
        ` : ""}

        <section class="lesson-summary">
          <h3>Key points</h3>
          <p>${escapeHTML(summary)}</p>
        </section>
      `;
    }

    // Reveal the lesson reader.
    if (reader) {
      reader.hidden = false;
      reader.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    // Hide the quiz until the learner chooses to start it.
    const quizSection = byId("quiz-section");

    if (quizSection) {
      quizSection.hidden = true;
    }
  }

  // 11. Connect the filter form to the lesson list.
  function setupFilters() {
    const form = byId("lesson-filter-form");

    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        renderLessons();
      });

      form.addEventListener("change", renderLessons);
    }
  }

  // 12. Let learners open a lesson from its card.
  function setupLessonList() {
    const lessonList = byId("lesson-list");

    if (!lessonList) {
      return;
    }

    lessonList.addEventListener("click", function (event) {
      const button = event.target.closest(".open-lesson-button");

      if (!button) {
        return;
      }

      openLesson(button.dataset.lessonId);
    });
  }

  // 13. Connect the Start Quiz button to quizzes.js.
  function setupQuizButton() {
    const button = byId("start-lesson-quiz");

    if (!button) {
      return;
    }

    button.addEventListener("click", function () {
      if (!currentLesson) {
        return;
      }

      // quizzes.js can listen for this event and start the quiz.
      document.dispatchEvent(new CustomEvent("iq:start-quiz", {
        detail: {
          lesson: currentLesson,
          language: getFilters().language
        }
      }));
    });
  }

  // 14. Load all three JSON files.
  async function loadLessons() {
    const message = byId("lesson-loading-message");
    const lessonList = byId("lesson-list");

    if (message) {
      message.textContent = "Loading lessons...";
    }

    try {
      const results = await Promise.all(
        LESSON_FILES.map(async function (file) {
          const response = await fetch(file);

          if (!response.ok) {
            throw new Error("Could not load " + file);
          }

          const data = await response.json();

          if (!Array.isArray(data)) {
            throw new Error(file + " must contain a JSON array.");
          }

          return data;
        })
      );

      allLessons = results.flat();

      // Prevent duplicate IDs from causing the wrong lesson to open.
      const ids = allLessons.map(function (lesson) {
        return lesson.id;
      });

      if (ids.some(function (id) { return !id; }) ||
          new Set(ids).size !== ids.length) {
        throw new Error("Every lesson needs a unique ID.");
      }

      applyURLFilters();
      renderLessons();

      if (message) {
        message.textContent =
          "Lessons loaded successfully. Choose a lesson to begin.";
      }
    } catch (error) {
      console.error("Imfundo Quest lesson loading error:", error);

      if (message) {
        message.textContent =
          "Lessons could not be loaded. Check your JSON files and run the project using VS Code Live Server.";
      }

      if (lessonList) {
        lessonList.innerHTML =
          '<p role="alert">Unable to load lessons. Please check the data folder and try again.</p>';
      }
    }
  }

  // 15. Make selected lesson information available to other scripts.
  window.IQLessons = {
    getAllLessons: function () {
      return [...allLessons];
    },

    getCurrentLesson: function () {
      return currentLesson;
    },

    getFilteredLessons: getFilteredLessons,
    openLesson: openLesson,
    reload: loadLessons
  };

  // 16. Start the application.
  setupFilters();
  setupLessonList();
  setupQuizButton();
  loadLessons();
})();
