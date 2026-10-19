
/*
 * Imfundo Quest
 * Shared application behaviour and learner dashboard.
 * Learner information and progress are saved in this browser.
 */

"use strict";

(function () {
  // 1. Information about the three learning subjects.
  const SUBJECTS = {
    mathematics: {
      name: "Mathematics",
      symbol: "∑",
      description: "Build confidence with numbers, patterns and functions."
    },
    "physical-sciences": {
      name: "Physical Sciences",
      symbol: "⚡",
      description: "Explore forces, energy, matter and movement."
    },
    "life-sciences": {
      name: "Life Sciences",
      symbol: "❋",
      description: "Understand living things and the systems that sustain life."
    }
  };

  // 2. Shortcuts for finding HTML elements.
  const byId = function (id) {
    return document.getElementById(id);
  };

  // 3. Escape text before placing it inside HTML.
  // This helps prevent user-provided text from becoming HTML code.
  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  }

  // 4. Load and display the learner dashboard.
  function setupLearnerPage() {
    const subjectsContainer = byId("learner-subjects");

    // If this is not the learner page, stop this function.
    if (!subjectsContainer || !window.IQStorage) {
      return;
    }

    // Read the saved learner information.
    const state = window.IQStorage.readState();

    // Fill in the saved profile details.
    if (byId("grade-select")) {
      byId("grade-select").value = state.profile.grade || "10";
    }

    if (byId("language-select")) {
      byId("language-select").value = state.profile.language || "en";
    }

    if (byId("learner-name")) {
      byId("learner-name").value = state.profile.name || "";
    }

    // Display the learner's progress.
    if (byId("xp-total")) {
      byId("xp-total").textContent = state.xp || 0;
    }

    if (byId("completed-total")) {
      byId("completed-total").textContent =
        state.completions.length;
    }

    if (byId("streak-total")) {
      const streak = state.streak || 0;
      byId("streak-total").textContent =
        streak + (streak === 1 ? " day" : " days");
    }

    // Display a card for each subject.
    subjectsContainer.innerHTML = Object.entries(SUBJECTS)
      .map(function (entry) {
        const id = entry[0];
        const subject = entry[1];

        return `
          <article class="subject-card">
            <div class="subject-symbol" aria-hidden="true">
              ${subject.symbol}
            </div>

            <p class="eyebrow">
              GRADE ${safe(state.profile.grade || "10")}
            </p>

            <h3>${safe(subject.name)}</h3>

            <p>${safe(subject.description)}</p>

            <a href="lessons.html?subject=${encodeURIComponent(id)}">
              Start a quest →
            </a>
          </article>
        `;
      })
      .join("");

    // Show the five most recent completed lessons.
    const recentActivity = byId("recent-activity");

    if (recentActivity) {
      const recent = [...state.completions]
        .reverse()
        .slice(0, 5);

      if (recent.length === 0) {
        recentActivity.innerHTML =
          '<p class="muted">Complete a lesson to see your activity here.</p>';
      } else {
        recentActivity.innerHTML = recent
          .map(function (item) {
            const date = item.date
              ? item.date.slice(0, 10)
              : "Date unavailable";

            return `
              <div class="activity-item">
                <div>
                  <strong>${safe(item.topic || "Completed lesson")}</strong>
                  <small>
                    ${safe(item.subject || "Subject")} · ${safe(date)}
                  </small>
                </div>

                <span class="pill">
                  ${safe(item.score ?? 0)}% · +${safe(item.xp ?? 0)} XP
                </span>
              </div>
            `;
          })
          .join("");
      }
    }

    // 5. Save the learner's name, grade and language.
    const saveButton = byId("save-profile");

    if (saveButton && !saveButton.dataset.listenerAdded) {
      saveButton.dataset.listenerAdded = "true";

      saveButton.addEventListener("click", function () {
        const latestState = window.IQStorage.readState();

        latestState.profile = {
          name: byId("learner-name")
            ? byId("learner-name").value.trim().slice(0, 40)
            : "",
          grade: byId("grade-select")
            ? byId("grade-select").value
            : "10",
          language: byId("language-select")
            ? byId("language-select").value
            : "en"
        };

        const saved = window.IQStorage.saveState(latestState);
        const message = byId("learner-message");

        if (message) {
          message.textContent = saved
            ? "Your choices have been saved on this device."
            : "Your choices could not be saved. Check your browser storage settings.";
        }

        // Refresh the dashboard only after a successful save.
        if (saved) {
          window.location.reload();
        }
      });
    }
  }

  // 6. Make subject information available to other JavaScript files.
  window.IQApp = {
    SUBJECTS: SUBJECTS,
    safe: safe
  };

  // 7. Run the dashboard setup.
  setupLearnerPage();

  // 8. Register offline support when the site is served over HTTP/HTTPS.
  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker
        .register("sw.js")
        .catch(function (error) {
          console.warn("Offline caching could not be enabled:", error);
        });
    });
  }
})();
