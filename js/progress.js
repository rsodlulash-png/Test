
/*
 * Imfundo Quest
 * Tracks lesson completion, XP, quiz scores and learning streaks.
 *
 * Requires storage.js to load before this file.
 */

"use strict";

(function () {
  // 1. XP settings.
  const XP_PER_CORRECT_ANSWER = 10;
  const XP_COMPLETION_BONUS = 5;

  // 2. Get the saved application state.
  function getState() {
    if (!window.IQStorage) {
      throw new Error("storage.js must load before progress.js.");
    }

    const state = window.IQStorage.readState();

    // Make sure the fields we need exist.
    state.profile = state.profile || {};
    state.completions = Array.isArray(state.completions)
      ? state.completions
      : [];
    state.xp = Number(state.xp) || 0;
    state.streak = Number(state.streak) || 0;
    state.completedLessonIds = Array.isArray(state.completedLessonIds)
      ? state.completedLessonIds
      : [];

    return state;
  }

  // 3. Format a date as YYYY-MM-DD using the learner's local date.
  function getLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // 4. Calculate the difference between two calendar dates.
  function daysBetween(firstDate, secondDate) {
    const first = firstDate.split("-").map(Number);
    const second = secondDate.split("-").map(Number);

    const firstUTC = Date.UTC(first[0], first[1] - 1, first[2]);
    const secondUTC = Date.UTC(second[0], second[1] - 1, second[2]);

    return Math.round((secondUTC - firstUTC) / 86400000);
  }

  // 5. Update the learner's daily streak.
  function updateStreak(state) {
    const today = getLocalDate(new Date());
    const lastDate = state.lastActivityDate;

    if (!lastDate) {
      state.streak = 1;
    } else {
      const difference = daysBetween(lastDate, today);

      if (difference === 0) {
        // The learner has already been active today.
        // Keep the current streak unchanged.
      } else if (difference === 1) {
        // Learning on consecutive days increases the streak.
        state.streak = Math.max(1, state.streak) + 1;
      } else if (difference > 1) {
        // A missed day resets the streak.
        state.streak = 1;
      }
    }

    state.lastActivityDate = today;
  }

  // 6. Validate the quiz score.
  function validateScore(score, total) {
    const validTotal = Number.isInteger(total) && total > 0;
    const validScore =
      Number.isInteger(score) &&
      score >= 0 &&
      score <= total;

    if (!validTotal || !validScore) {
      throw new Error("The quiz score or total number of questions is invalid.");
    }
  }

  // 7. Record a completed lesson and award XP.
  function recordCompletion(lesson, score, total) {
    if (!lesson || !lesson.id) {
      throw new Error("A valid lesson with an ID is required.");
    }

    validateScore(score, total);

    const state = getState();
    const percentage = Math.round((score / total) * 100);
    const isFirstCompletion =
      !state.completedLessonIds.includes(lesson.id);

    // Award XP only for the first completion of a lesson.
    // Repeated attempts are still recorded in the activity history.
    const xpEarned = isFirstCompletion
      ? (score * XP_PER_CORRECT_ANSWER) + XP_COMPLETION_BONUS
      : 0;

    const completion = {
      lessonId: lesson.id,
      topic: lesson.title || lesson.topic || "Completed lesson",
      subject: lesson.subject || "Unknown subject",
      grade: lesson.grade || state.profile.grade || "10",
      score: percentage,
      correctAnswers: score,
      totalQuestions: total,
      xp: xpEarned,
      date: new Date().toISOString()
    };

    state.completions.push(completion);
    state.completions = state.completions.slice(-500);

    if (isFirstCompletion) {
      state.completedLessonIds.push(lesson.id);
    }

    state.xp += xpEarned;
    updateStreak(state);

    const saved = window.IQStorage.saveState(state);

    if (!saved) {
      throw new Error("Progress could not be saved on this device.");
    }

    // Notify other parts of the app that progress has changed.
    document.dispatchEvent(new CustomEvent("iq:progress-updated", {
      detail: {
        completion: completion,
        xpTotal: state.xp,
        streak: state.streak,
        completedLessons: state.completedLessonIds.length
      }
    }));

    return {
      completion: completion,
      percentage: percentage,
      xpEarned: xpEarned,
      xpTotal: state.xp,
      streak: state.streak,
      isFirstCompletion: isFirstCompletion
    };
  }

  // 8. Return a summary for the learner dashboard.
  function getSummary() {
    const state = getState();

    const totalAttempts = state.completions.length;

    const averageScore = totalAttempts
      ? Math.round(
          state.completions.reduce(function (sum, item) {
            return sum + (Number(item.score) || 0);
          }, 0) / totalAttempts
        )
      : 0;

    return {
      xp: state.xp,
      streak: state.streak,
      completedLessons: state.completedLessonIds.length,
      totalAttempts: totalAttempts,
      averageScore: averageScore,
      recentCompletions: [...state.completions].reverse().slice(0, 5)
    };
  }

  // 9. Make the progress functions available to other JS files.
  window.IQProgress = {
    recordCompletion: recordCompletion,
    getSummary: getSummary
  };
})();
