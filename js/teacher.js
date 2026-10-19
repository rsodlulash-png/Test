
"use strict";

(function () {
    const storage = window.IQStorage;

    const elements = {
        learnerCount: document.getElementById("teacher-learner-count"),
        completionCount: document.getElementById("teacher-completion-count"),
        totalXP: document.getElementById("teacher-total-xp"),
        averageScore: document.getElementById("teacher-average-score"),

        reportBody: document.getElementById("teacher-report-body"),
        searchForm: document.getElementById("teacher-search-form"),
        searchInput: document.getElementById("teacher-search"),
        gradeFilter: document.getElementById("filter-grade"),
        subjectFilter: document.getElementById("filter-subject"),

        refreshButton: document.getElementById("refresh-report"),
        exportCSVButton: document.getElementById("export-csv"),
        exportJSONButton: document.getElementById("export-json"),
        importJSONButton: document.getElementById("import-json"),
        importFile: document.getElementById("import-report"),
        message: document.getElementById("teacher-report-message")
    };

    let allReports = [];

    // Read the saved information from this browser.
    function getState() {
        if (!storage) {
            showMessage(
                "Storage could not be loaded. Check that storage.js is linked before teacher.js.",
                true
            );
            return null;
        }

        return storage.readState();
    }

    // Display a message to the teacher.
    function showMessage(message, isError) {
        if (!elements.message) return;

        elements.message.textContent = message;
        elements.message.style.color = isError ? "#b42318" : "#176b45";
    }

    // Convert different subject formats into readable names.
    function formatSubject(subject) {
        const subjects = {
            mathematics: "Mathematics",
            "physical-sciences": "Physical Sciences",
            "life-sciences": "Life Sciences",
            english: "English",
            isixhosa: "isiXhosa"
        };

        return subjects[subject] || subject || "Not specified";
    }

    // Make text safe before displaying it as HTML.
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return replacements[character];
        });
    }

    // Format a date for display.
    function formatDate(value) {
        if (!value) return "Not available";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString();
    }

    // Prepare the current browser's completion records.
    function loadReports() {
        const state = getState();

        if (!state) return;

        const learnerName = state.profile?.name || "Current learner";
        const learnerGrade = state.profile?.grade || "Not specified";

        const localReports = (state.completions || []).map(function (report) {
            return {
                ...report,
                learnerName: report.learnerName || learnerName,
                grade: report.grade || learnerGrade,
                subject: report.subject || "",
                topic: report.topic || report.lessonTitle || "Untitled lesson"
            };
        });

        const importedReports = (state.importedReports || []).map(function (report) {
            return {
                ...report,
                learnerName: report.learnerName || report.name || "Imported learner",
                grade: report.grade || "Not specified",
                subject: report.subject || "",
                topic: report.topic || report.lessonTitle || "Untitled lesson"
            };
        });

        allReports = [...localReports, ...importedReports];

        renderDashboard(state);
        renderReports();
    }

    // Update the four dashboard statistics.
    function renderDashboard(state) {
        const reports = allReports;

        const learnerNames = new Set(
            reports.map(function (report) {
                return String(report.learnerName || "Unknown learner").trim();
            })
        );

        // Include the current learner even before their first completion.
        if (state.profile?.name) {
            learnerNames.add(state.profile.name.trim());
        }

        const totalXP = Number(state.xp) || 0;

        const validScores = reports
            .map(function (report) {
                return Number(report.score);
            })
            .filter(function (score) {
                return Number.isFinite(score) && score >= 0 && score <= 100;
            });

        const average = validScores.length
            ? Math.round(
                validScores.reduce(function (sum, score) {
                    return sum + score;
                }, 0) / validScores.length
            )
            : 0;

        if (elements.learnerCount) {
            elements.learnerCount.textContent = learnerNames.size;
        }

        if (elements.completionCount) {
            elements.completionCount.textContent = reports.length;
        }

        if (elements.totalXP) {
            elements.totalXP.textContent = totalXP.toLocaleString();
        }

        if (elements.averageScore) {
            elements.averageScore.textContent = average + "%";
        }
    }

    // Display completion records in the table.
    function renderReports() {
        if (!elements.reportBody) return;

        const searchText = (
            elements.searchInput?.value || ""
        ).trim().toLowerCase();

        const selectedGrade = elements.gradeFilter?.value || "";
        const selectedSubject = elements.subjectFilter?.value || "";

        const filteredReports = allReports.filter(function (report) {
            const learnerName = String(report.learnerName || "").toLowerCase();
            const topic = String(report.topic || "").toLowerCase();
            const subject = String(report.subject || "").toLowerCase();
            const grade = String(report.grade || "");

            const matchesSearch =
                learnerName.includes(searchText) ||
                topic.includes(searchText) ||
                subject.includes(searchText);

            const matchesGrade =
                !selectedGrade || grade === selectedGrade;

            const matchesSubject =
                !selectedSubject || subject === selectedSubject;

            return matchesSearch && matchesGrade && matchesSubject;
        });

        if (filteredReports.length === 0) {
            elements.reportBody.innerHTML = `
                <tr>
                    <td colspan="7">No matching learning records found.</td>
                </tr>
            `;
            return;
        }

        elements.reportBody.innerHTML = filteredReports.map(function (report) {
            const score = Number(report.score);
            const displayedScore = Number.isFinite(score)
                ? score + "%"
                : "Not available";

            const xp = Number(report.xp) || 0;

            return `
                <tr>
                    <td>${escapeHTML(report.learnerName || "Unknown learner")}</td>
                    <td>${escapeHTML(report.grade || "Not specified")}</td>
                    <td>${escapeHTML(formatSubject(report.subject))}</td>
                    <td>${escapeHTML(report.topic || "Untitled lesson")}</td>
                    <td>${escapeHTML(displayedScore)}</td>
                    <td>${escapeHTML(xp)}</td>
                    <td>${escapeHTML(formatDate(report.date))}</td>
                </tr>
            `;
        }).join("");
    }

    // Download a file in the browser.
    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    // Export all visible report fields as CSV.
    function exportCSV() {
        const headings = [
            "Learner",
            "Grade",
            "Subject",
            "Lesson",
            "Score",
            "XP",
            "Date"
        ];

        const rows = allReports.map(function (report) {
            return [
                report.learnerName || "Unknown learner",
                report.grade || "Not specified",
                formatSubject(report.subject),
                report.topic || "Untitled lesson",
                report.score ?? "",
                report.xp ?? 0,
                report.date || ""
            ];
        });

        function csvCell(value) {
            const safeValue = String(value ?? "");
            return '"' + safeValue.replace(/"/g, '""') + '"';
        }

        const csv = [headings, ...rows]
            .map(function (row) {
                return row.map(csvCell).join(",");
            })
            .join("\r\n");

        downloadFile(
            "\uFEFF" + csv,
            "imfundo-quest-report.csv",
            "text/csv;charset=utf-8;"
        );

        showMessage("CSV report exported successfully.", false);
    }

    // Export report data as JSON.
    function exportJSON() {
        const exportData = {
            exportedAt: new Date().toISOString(),
            project: "Imfundo Quest",
            reports: allReports
        };

        downloadFile(
            JSON.stringify(exportData, null, 2),
            "imfundo-quest-report.json",
            "application/json"
        );

        showMessage("JSON report exported successfully.", false);
    }

    // Accept either a report array, an exported report object,
    // or a complete Imfundo Quest state export.
    function extractImportedReports(data) {
        if (Array.isArray(data)) {
            return data;
        }

        if (data && Array.isArray(data.reports)) {
            return data.reports;
        }

        if (data && Array.isArray(data.completions)) {
            const name = data.profile?.name || "Imported learner";
            const grade = data.profile?.grade || "Not specified";

            return data.completions.map(function (report) {
                return {
                    ...report,
                    learnerName: report.learnerName || name,
                    grade: report.grade || grade
                };
            });
        }

        if (data && data.state && Array.isArray(data.state.completions)) {
            const name = data.state.profile?.name || "Imported learner";
            const grade = data.state.profile?.grade || "Not specified";

            return data.state.completions.map(function (report) {
                return {
                    ...report,
                    learnerName: report.learnerName || name,
                    grade: report.grade || grade
                };
            });
        }

        throw new Error(
            "The file must contain a reports array or a completions array."
        );
    }

    // Check each imported record before saving it.
    function validateReport(report) {
        if (!report || typeof report !== "object" || Array.isArray(report)) {
            return false;
        }

        const score = Number(report.score);
        const grade = String(report.grade ?? "");

        return (
            typeof (report.topic || report.lessonTitle) === "string" &&
            Number.isFinite(score) &&
            score >= 0 &&
            score <= 100 &&
            ["10", "11", "12", "Not specified"].includes(grade)
        );
    }

    async function importJSON() {
        const file = elements.importFile?.files?.[0];

        if (!file) {
            showMessage("Choose a JSON file before importing.", true);
            return;
        }

        if (!file.name.toLowerCase().endsWith(".json")) {
            showMessage("Please choose a .json file.", true);
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showMessage("The file is too large. Maximum size is 2 MB.", true);
            return;
        }

        try {
            const data = JSON.parse(await file.text());
            const reports = extractImportedReports(data);

            if (reports.length > 1000) {
                throw new Error("A file can contain at most 1,000 reports.");
            }

            const validReports = reports.filter(validateReport);

            if (reports.length > 0 && validReports.length === 0) {
                throw new Error(
                    "No valid records were found. Check that each record has a lesson, grade and score."
                );
            }

            const state = getState();

            if (!state) return;

            state.importedReports = [
                ...(state.importedReports || []),
                ...validReports.map(function (report) {
                    return {
                        learnerName: String(
                            report.learnerName || report.name || "Imported learner"
                        ).slice(0, 100),
                        grade: String(report.grade || "Not specified"),
                        subject: String(report.subject || "").slice(0, 100),
                        topic: String(
                            report.topic || report.lessonTitle || "Untitled lesson"
                        ).slice(0, 200),
                        score: Number(report.score),
                        xp: Math.max(0, Number(report.xp) || 0),
                        date: String(report.date || "")
                    };
                })
            ].slice(-1000);

            if (!storage.saveState(state)) {
                throw new Error("The reports could not be saved in this browser.");
            }

            loadReports();

            showMessage(
                validReports.length + " report(s) imported successfully.",
                false
            );

            elements.importFile.value = "";
        } catch (error) {
            showMessage(
                "Import failed: " + error.message,
                true
            );
        }
    }

    // Connect buttons, filters and search to their functions.
    function setupEvents() {
        elements.refreshButton?.addEventListener("click", loadReports);

        elements.exportCSVButton?.addEventListener("click", exportCSV);

        elements.exportJSONButton?.addEventListener("click", exportJSON);

        elements.importJSONButton?.addEventListener("click", importJSON);

        elements.searchForm?.addEventListener("submit", function (event) {
            event.preventDefault();
            renderReports();
        });

        elements.searchInput?.addEventListener("input", renderReports);

        elements.gradeFilter?.addEventListener("change", renderReports);

        elements.subjectFilter?.addEventListener("change", renderReports);
    }

    // Start the teacher dashboard when the page loads.
    function initTeacherDashboard() {
        setupEvents();
        loadReports();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initTeacherDashboard
        );
    } else {
        initTeacherDashboard();
    }
})();
