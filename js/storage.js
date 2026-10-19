
/*
 * Imfundo Quest
 * Local storage manager.
 *
 * Saves learner profiles, XP, completed lessons, quiz results,
 * learning streaks and imported teacher reports.
 */

"use strict";

(function () {
  // 1. Keys used to save data in the browser.
  const STORAGE_KEYS = {
    state: "imfundoQuest.state.v1"
  };

  // 2. Default data for a new learner.
  function createDefaultState() {
    return {
      profile: {
        name: "",
        grade: "10",
        language: "en"
      },

      xp: 0,
      streak: 0,
      lastActivityDate: "",

      completedLessonIds: [],
      completions: [],
      importedReports: []
    };
  }

  // 3. Check that a value is a valid, non-negative number.
  function validNumber(value) {
    return Number.isFinite(value) && value >= 0;
  }

  // 4. Clean and validate saved data.
  function normaliseState(data) {
    const defaults = createDefaultState();

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return defaults;
    }

    const profile =
      data.profile &&
      typeof data.profile === "object" &&
      !Array.isArray(data.profile)
        ? data.profile
        : {};

    const validGrades = ["10", "11", "12"];
    const validLanguages = ["en", "xh"];

    const grade = String(profile.grade ?? defaults.profile.grade);
    const language = String(
      profile.language ?? defaults.profile.language
    );

    const completions = Array.isArray(data.completions)
      ? data.completions.filter(function (item) {
          return item && typeof item === "object" &&
            !Array.isArray(item);
        }).slice(-500)
      : [];

    const importedReports = Array.isArray(data.importedReports)
      ? data.importedReports.filter(function (item) {
          return item && typeof item === "object" &&
            !Array.isArray(item);
        }).slice(-1000)
      : [];

    const completedLessonIds = Array.isArray(data.completedLessonIds)
      ? [...new Set(
          data.completedLessonIds.filter(function (id) {
            return typeof id === "string" && id.length > 0;
          })
        )].slice(-500)
      : [];

    return {
      profile: {
        name: typeof profile.name === "string"
          ? profile.name.trim().slice(0, 40)
          : "",
        grade: validGrades.includes(grade) ? grade : "10",
        language: validLanguages.includes(language) ? language : "en"
      },

      xp: validNumber(data.xp) ? data.xp : 0,
      streak: validNumber(data.streak) ? data.streak : 0,

      lastActivityDate:
        typeof data.lastActivityDate === "string"
          ? data.lastActivityDate
          : "",

      completedLessonIds: completedLessonIds,
      completions: completions,
      importedReports: importedReports
    };
  }

  // 5. Read the saved data.
  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.state);

      if (raw === null) {
        return createDefaultState();
      }

      const parsed = JSON.parse(raw);
      return normaliseState(parsed);
    } catch (error) {
      console.error("Imfundo Quest could not read saved data:", error);

      // Keep the application usable if storage is unavailable.
      return createDefaultState();
    }
  }

  // 6. Save the latest state.
  // Returns true if saving succeeds, otherwise false.
  function saveState(state) {
    try {
      const cleanState = normaliseState(state);
      const serialised = JSON.stringify(cleanState);

      localStorage.setItem(STORAGE_KEYS.state, serialised);
      return true;
    } catch (error) {
      console.error("Imfundo Quest could not save data:", error);
      return false;
    }
  }

  // 7. Remove saved data and start again.
  function resetState() {
    try {
      localStorage.removeItem(STORAGE_KEYS.state);
      return true;
    } catch (error) {
      console.error("Imfundo Quest could not reset data:", error);
      return false;
    }
  }

  // 8. Export a copy of the saved state as a JSON string.
  function exportState() {
    return JSON.stringify(readState(), null, 2);
  }

  // 9. Import data after checking that it is valid JSON.
  function importState(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return {
          success: false,
          message: "The imported file must contain a JSON object."
        };
      }

      const cleanState = normaliseState(parsed);

      const saved = saveState(cleanState);

      if (!saved) {
        return {
          success: false,
          message: "The data could not be saved on this device."
        };
      }

      return {
        success: true,
        message: "Your data was imported successfully."
      };
    } catch (error) {
      return {
        success: false,
        message: "The file is not valid JSON."
      };
    }
  }

  // 10. Make these functions available to the other JavaScript files.
  window.IQStorage = {
    readState: readState,
    saveState: saveState,
    resetState: resetState,
    exportState: exportState,
    importState: importState,
    createDefaultState: createDefaultState
  };
})();
