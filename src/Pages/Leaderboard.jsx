import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import Navbar from "../components/Navbar";
import api from "../api/axios";

function formatSubmissionTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
  }).format(date);
}

export default function Leaderboard() {
  const navigate = useNavigate();

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] =
    useState(1);

  const rowsPerPage = 5;

  /* =========================================================
     FETCH LEADERBOARD
  ========================================================= */

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await api.get("/leaderboard/");

        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.leaderboard ||
            response.data?.data ||
            [];

        const formattedData = data.map(
          (item, index) => ({
            rank:
              Number(item.rank) ||
              index + 1,

            teamname:
              item.teamname ||
              item.team_name ||
              item.username ||
              "Unknown",

            q1:
              Number(item.problem_1) || 0,

            q2:
              Number(item.problem_2) || 0,

            q3:
              Number(item.problem_3) || 0,

            q4:
              Number(item.problem_4) || 0,

            total:
              Number(item.total_score) || 0,

            time:
              item.last_submission_time ||
              "-",
          })
        );

        /*
         * Sort by total score.
         * Higher score appears first.
         */

        formattedData.sort(
          (a, b) => b.total - a.total
        );

        /*
         * Recalculate displayed rank after sorting.
         */

        const rankedData =
          formattedData.map(
            (item, index) => ({
              ...item,
              rank: index + 1,
            })
          );

        setLeaderboard(rankedData);
        setCurrentPage(1);
      } catch (err) {
        console.error(
          "Error fetching leaderboard:",
          err
        );

        if (
          err?.response?.status === 403
        ) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        setError(
          err?.response?.data?.message ||
            "Unable to load leaderboard."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [navigate]);

  /* =========================================================
     PAGINATION
  ========================================================= */

  const totalPages = Math.ceil(
    leaderboard.length / rowsPerPage
  );

  const startIndex =
    (currentPage - 1) *
    rowsPerPage;

  const currentRows =
    leaderboard.slice(
      startIndex,
      startIndex + rowsPerPage
    );

  const handlePrevious = () => {
    setCurrentPage((page) =>
      Math.max(page - 1, 1)
    );
  };

  const handleNext = () => {
    setCurrentPage((page) =>
      Math.min(page + 1, totalPages)
    );
  };

  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <main className="event-page">
      <Navbar />

      <section className="content leaderboard-content">

        {/* ================= HEADER ================= */}

        <div className="hub-heading leaderboard-heading">

          <div className="trophy">
            ♜
          </div>

          <div>
            <h1>
              LEADERBOARDS
            </h1>

            <p>
              Top performers in the event
            </p>
          </div>

        </div>

        {/* ================= TABLE ================= */}

        <div className="leaderboard-shell">

          {loading ? (
            <div
              style={{
                padding: "50px",
                textAlign: "center",
              }}
            >
              Loading leaderboard...
            </div>
          ) : error ? (
            <div
              style={{
                padding: "50px",
                textAlign: "center",
              }}
            >
              <p>{error}</p>

              <button
                onClick={() =>
                  window.location.reload()
                }
              >
                Try Again
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            <div
              style={{
                padding: "50px",
                textAlign: "center",
              }}
            >
              No leaderboard data available.
            </div>
          ) : (
            <>
              <table>

                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Q1</th>
                    <th>Q2</th>
                    <th>Q3</th>
                    <th>Q4</th>
                    <th>Total</th>
                    <th>Time</th>
                  </tr>
                </thead>

                <tbody>

                  {currentRows.map(
                    (item) => (
                      <tr
                        key={`${item.teamname}-${item.rank}`}
                      >

                        <td>
                          {item.rank}
                        </td>

                        <td>
                          {item.teamname}
                        </td>

                        <td>
                          {item.q1}
                        </td>

                        <td>
                          {item.q2}
                        </td>

                        <td>
                          {item.q3}
                        </td>

                        <td>
                          {item.q4}
                        </td>

                        <td>
                          <strong>
                            {item.total}
                          </strong>
                        </td>

                        <td>
                          {formatSubmissionTime(item.time)}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

              {/* ================= PAGINATION ================= */}

              {totalPages > 1 && (
                <div
                  className="leaderboard-pagination"
                  style={{
                    display: "flex",
                    justifyContent:
                      "center",
                    alignItems: "center",
                    gap: "15px",
                    padding: "20px",
                  }}
                >

                  <button
                    onClick={
                      handlePrevious
                    }
                    disabled={
                      currentPage === 1
                    }
                  >
                    Previous
                  </button>

                  <span>
                    Page{" "}
                    {currentPage} of{" "}
                    {totalPages}
                  </span>

                  <button
                    onClick={
                      handleNext
                    }
                    disabled={
                      currentPage ===
                      totalPages
                    }
                  >
                    Next
                  </button>

                </div>
              )}

            </>
          )}

        </div>

      </section>
    </main>
  );
}