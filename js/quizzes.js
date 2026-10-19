
/*
 * Imfundo Quest
 * Interactive quizzes, answer feedback, scoring and progress tracking.
 *
 * Requires:
 *   storage.js
 *   progress.js
 *   lessons.js
 */

"use strict";

(function () {
  // Keep track of the current quiz.
  let currentLesson = null;
  let currentQuestionIndex = 0;
  let correctAnswers = 0;
  let answered = false;
  let quizFinished = false;

  // Save the learner's selected answers.
  let selectedAnswers = [];

  // Find an HTML element by ID.
  function byId(id) {
    return document.getElementById(id);
  }

  // Safely display text.
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

  // Get the questions belonging to the selected lesson.
  function getQuestions() {
    if (!currentLesson || !Array.isArray(currentLesson.quiz)) {
      return [];
    }

    return currentLesson.quiz;
  }

  // Display a message to the learner.
  function showFeedback(message, type) {
    const feedback = byId("quiz-feedback");

    if (!feedback) {
      return;
    }

    feedback.textContent = message;
    feedback.className = "quiz-feedback " + (type || "");
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
  }

  // Show the current question and its answer choices.
  function renderQuestion() {
    const questions = getQuestions();

    if (!questions.length) {
      showFeedback("There are no questions available for this lesson.", "error");
      return;
    }

    const question = questions[currentQuestionIndex];
    const questionText = byId("quiz-question-text");
    const optionsContainer = byId("quiz-options");
    const submitButton = byId("submit-quiz-answer");
    const nextButton = byId("next-quiz-question");
    const results = byId("quiz-results");

    answered = false;

    if (questionText) {
      questionText.textContent =
        "Question " + (currentQuestionIndex + 1) +
        " of " + questions.length + ": " +
        question.question;
    }

    if (optionsContainer) {
      optionsContainer.innerHTML = question.options
        .map(function (option, index) {
          return `
            <label class="quiz-option">
              <input
                type="radio"
                name="quiz-answer"
                value="${index}"
              >
              <span>${escapeHTML(option)}</span>
            </label>
          `;
        })
        .join("");
    }

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.hidden = false;
      submitButton.textContent = "Check answer";
    }

    if (nextButton) {
      nextButton.disabled = true;
      nextButton.hidden = false;
      nextButton.textContent =
        currentQuestionIndex === questions.length - 1
          ? "Finish quiz"
          : "Next question";
    }

    if (results) {
      results.hidden = true;
    }

    showFeedback("Choose an answer, then check your response.", "");

    // Focus the question text for keyboard and screen-reader users.
    if (questionText) {
      questionText.setAttribute("tabindex", "-1");
      questionText.focus();
    }
  }

  // Start a quiz for the selected lesson.
  function startQuiz(lesson) {
    if (!lesson || !Array.isArray(lesson.quiz) || lesson.quiz.length === 0) {
      showFeedback("This lesson does not have a quiz yet.", "error");
      return;
    }

    // Every question must have valid options and a valid answer index.
    const validQuiz = lesson.quiz.every(function (question) {
      return (
        typeof question.question === "string" &&
        Array.isArray(question.options) &&
        question.options.length >= 2 &&
        Number.isInteger(question.answerIndex) &&
        question.answerIndex >= 0 &&
        question.answerIndex < question.options.length
      );
    });

    if (!validQuiz) {
      showFeedback(
        "This quiz contains an invalid question. Please check the lesson JSON file.",
        "error"
      );
      return;
    }

    currentLesson = lesson;
    currentQuestionIndex = 0;
    correctAnswers = 0;
    answered = false;
    quizFinished = false;
    selectedAnswers = [];

    const quizSection = byId("quiz-section");

    if (quizSection) {
      quizSection.hidden = false;
      quizSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    renderQuestion();
  }

  // Check the learner's selected answer.
  function checkAnswer(event) {
    if (event) {
      event.preventDefault();
    }

    if (answered || quizFinished) {
      return;
    }

    const questions = getQuestions();
    const question = questions[currentQuestionIndex];
    const selected = document.querySelector(
      'input[name="quiz-answer"]:checked'
    );

    if (!selected) {
      showFeedback("Please choose an answer before continuing.", "error");
      return;
    }

    const selectedIndex = Number(selected.value);
    const isCorrect = selectedIndex === question.answerIndex;

    selectedAnswers[currentQuestionIndex] = selectedIndex;

    if (isCorrect) {
      correctAnswers += 1;
      showFeedback("Correct! " + (question.explanation || "Well done."), "correct");
    } else {
      const correctOption = question.options[question.answerIndex];

      showFeedback(
        "Not quite. The correct answer is: " +
        correctOption + ". " +
        (question.explanation || "Review this topic and try again."),
        "incorrect"
      );
    }

    answered = true;

    // Prevent changes after an answer has been checked.
    document.querySelectorAll('input[name="quiz-answer"]').forEach(
      function (input) {
        input.disabled = true;
      }
    );

    const submitButton = byId("submit-quiz-answer");
    const nextButton = byId("next-quiz-question");

    if (submitButton) {
      submitButton.disabled = true;
    }

    if (nextButton) {
      nextButton.disabled = false;
      nextButton.focus();
    }
  }

  // Move to the next question or finish the quiz.
  function nextQuestion() {
    if (!answered || quizFinished) {
      return;
    }

    const questions = getQuestions();

    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex += 1;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }

  // Display the final score and record the result.
  function finishQuiz() {
    if (quizFinished) {
      return;
    }

    quizFinished = true;

    const questions = getQuestions();
    const totalQuestions = questions.length;
    const percentage = Math.round(
      (correctAnswers / totalQuestions) * 100
    );

    let progressResult = null;
    let saveError = false;

    // Record the result through progress.js.
    if (window.IQProgress &&
        typeof window.IQProgress.recordCompletion === "function") {
      try {
        progressResult = window.IQProgress.recordCompletion(
          currentLesson,
          correctAnswers,
          totalQuestions
        );
      } catch (error) {
        console.error("Could not save quiz progress:", error);
        saveError = true;
      }
    } else {
      saveError = true;
      console.error("progress.js has not loaded.");
    }

    // Hide question controls.
    const submitButton = byId("submit-quiz-answer");
    const nextButton = byId("next-quiz-question");
    const optionsContainer = byId("quiz-options");
    const results = byId("quiz-results");

    if (submitButton) {
      submitButton.hidden = true;
    }

    if (nextButton) {
      nextButton.hidden = true;
    }

    if (optionsContainer) {
      optionsContainer.innerHTML = "";
    }

    // Display final results.
    if (results) {
      results.hidden = false;
    }

    if (byId("quiz-score")) {
      byId("quiz-score").textContent =
        correctAnswers + " / " + totalQuestions +
        " correct (" + percentage + "%)";
    }

    if (byId("quiz-xp")) {
      byId("quiz-xp").textContent = progressResult
        ? String(progressResult.xpEarned)
        : "0";
    }

    let message;

    if (percentage === 100) {
      message = "Excellent work! You answered every question correctly.";
    } else if (percentage >= 70) {
      message = "Great effort! Review any questions you missed.";
    } else {
      message = "Keep practising. Review the lesson and try again.";
    }

    if (saveError) {
      message += " Your result could not be confirmed as saved.";
    }

    showFeedback(message, percentage >= 70 ? "correct" : "incorrect");

    // Tell other parts of the app that the quiz has ended.
    document.dispatchEvent(new CustomEvent("iq:quiz-finished", {
      detail: {
        lesson: currentLesson,
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions,
        percentage: percentage,
        progress: progressResult
      }
    }));
  }

  // Retry the same quiz from the beginning.
  function retryQuiz() {
    if (currentLesson) {
      startQuiz(currentLesson);
    }
  }

  // Return to the lesson list.
  function returnToLessons() {
    const quizSection = byId("quiz-section");
    const reader = byId("lesson-reader");

    if (quizSection) {
      quizSection.hidden = true;
    }

    if (reader) {
      reader.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  // Connect quiz buttons to their actions.
  function setupButtons() {
    const form = byId("lesson-quiz-form");
    const nextButton = byId("next-quiz-question");
    const retryButton = byId("retry-quiz");
    const backButton = byId("back-to-lessons");

    if (form) {
      form.addEventListener("submit", checkAnswer);
    }

    if (nextButton) {
      nextButton.addEventListener("click", nextQuestion);
    }

    if (retryButton) {
      retryButton.addEventListener("click", retryQuiz);
    }

    if (backButton) {
      backButton.addEventListener("click", returnToLessons);
    }
  }

  // Listen for the event dispatched by lessons.js.
  document.addEventListener("iq:start-quiz", function (event) {
    const detail = event.detail || {};
    startQuiz(detail.lesson);
  });

  // Make quiz functions available to other scripts if needed.
  window.IQQuizzes = {
    startQuiz: startQuiz,
    retryQuiz: retryQuiz,
    getCurrentLesson: function () {
      return currentLesson;
    }
  };

  // Initialise event listeners.
  setupButtons();
})();
