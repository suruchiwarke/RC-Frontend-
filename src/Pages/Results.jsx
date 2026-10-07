import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Medal,
  Target,
  BarChart3,
  ArrowRight,
  Users,
} from "lucide-react";

import Navbar from "../components/Navbar";
import PageBackground from "../components/PageBackground";
import api from "../api/axios";

import "./Results.css";

function Results() {
  const navigate = useNavigate();

  /* =========================================================
     RESULT DATA
  ========================================================= */

  const [resultData, setResultData] = useState({
    teamname: "",
    isjunior: false,
    rank: 0,
    totalScore: 0,
    totalSubmissions: 0,
    problemsSolved: 0,
    accuracy: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================================================
     FETCH RESULTS
  ========================================================= */

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/result/");

        console.log("Results API response:", response.data);

        /*
         * Backend response:
         *
         * {
         *   teamname: "rcj",
         *   isjunior: true,
         *   rank: 1,
         *   total_score: 400,
         *   total_submissions: 30,
         *   problems_solved: "20",
         *   accuracy: "66.67%"
         * }
         */

        const data = response.data;

        if (!data || typeof data !== "object") {
          setError("No result data available.");
          return;
        }

        /*
         * Accuracy comes from backend as:
         *
         * "66.67%"
         *
         * Remove "%" before converting to number.
         */

        const accuracyValue = parseFloat(
          String(data.accuracy ?? "0").replace("%", "")
        );

        setResultData({
          teamname: data.teamname || "",

          isjunior: Boolean(data.isjunior),

          rank: Number(data.rank) || 0,

          totalScore:
            Number(data.total_score) || 0,

          totalSubmissions:
            Number(data.total_submissions) || 0,

          problemsSolved:
            Number(data.problems_solved) || 0,

          accuracy:
            Number.isFinite(accuracyValue)
              ? accuracyValue
              : 0,
        });
      } catch (err) {
        console.error(
          "Error fetching results:",
          err
        );

        if (err?.response?.status === 403) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        setError(
          err?.response?.data?.message ||
            "Unable to load your results."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [navigate]);

  /* =========================================================
     LEADERBOARD
  ========================================================= */

  const handleLeaderboard = () => {
    navigate("/leaderboard");
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <PageBackground className="results-page">
        <Navbar />

        <main className="results-container">
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
            }}
          >
            Loading results...
          </div>
        </main>
      </PageBackground>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <PageBackground className="results-page">
        <Navbar />

        <main className="results-container">
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
            }}
          >
            <p>{error}</p>

            <button
              className="leaderboard-btn"
              onClick={() =>
                window.location.reload()
              }
            >
              Try Again
            </button>
          </div>
        </main>
      </PageBackground>
    );
  }

  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <PageBackground className="results-page">

      {/* ================= NAVBAR ================= */}

      <Navbar />

      {/* ================= RESULTS ================= */}

      <main className="results-container">

        {/* ================= HEADER ================= */}

        <div className="results-title">

          <div className="results-title-icon">
            <Trophy
              size={30}
              strokeWidth={2}
            />
          </div>

          <div className="results-title-text">

            <h1>
              RESULT
            </h1>

            <p>
              Here's how you performed in the event
            </p>

          </div>

        </div>

        {/* ================= TEAM NAME ================= */}

        <div className="result-team">

          <Users size={17} />

          <span>
            Team:
          </span>

          <strong>
            {resultData.teamname || "-"}
          </strong>

          <span className="team-category">
            {resultData.isjunior
              ? "Junior"
              : "Senior"}
          </span>

        </div>

        {/* ================= MAIN CONTENT ================= */}

        <div className="results-content">

          {/* ================= LEFT SIDE ================= */}

          <div className="results-left">

            <div className="results-cards">

              {/* RANK */}

              <div className="result-card">

                <div className="result-card-icon">
                  <Medal size={16} />
                </div>

                <div className="result-value">
                  {resultData.rank}
                </div>

                <div className="result-label">
                  Your Rank
                </div>

              </div>

              {/* SCORE */}

              <div className="result-card">

                <div className="result-card-icon">
                  <Target size={16} />
                </div>

                <div className="result-value">
                  {resultData.totalScore}
                </div>

                <div className="result-label">
                  Total Score
                </div>

              </div>

              {/* TOTAL SUBMISSIONS */}

              <div className="result-card">

                <div className="result-card-icon">
                  <BarChart3 size={16} />
                </div>

                <div className="result-value">
                  {resultData.totalSubmissions}
                </div>

                <div className="result-label">
                  Total Submissions
                </div>

              </div>

              {/* PROBLEMS SOLVED */}

              <div className="result-card">

                <div className="result-card-icon">
                  <Target size={16} />
                </div>

                <div className="result-value">
                  {resultData.problemsSolved}
                </div>

                <div className="result-label">
                  Total correct submissions
                </div>

              </div>

              {/* ACCURACY */}

              {/* <div className="result-card">

                <div className="result-card-icon">
                  <BarChart3 size={16} />
                </div>

                <div className="result-value">
                  {resultData.accuracy.toFixed(2)}%
                </div>

                <div className="result-label">
                  Accuracy
                </div>

              </div> */}

            </div>

            {/* ================= LEADERBOARD ================= */}

            <button
              className="leaderboard-btn"
              onClick={handleLeaderboard}
            >

              <BarChart3 size={15} />

              <span>
                View Leaderboard
              </span>

              <ArrowRight size={16} />

            </button>

          </div>

          {/* ================= ACCURACY ================= */}

          <div className="accuracy-box">

            <div
              className="accuracy-ring"
              style={{
                "--accuracy": `${resultData.accuracy}%`,
              }}
            >

              <div className="accuracy-value">
                {resultData.accuracy.toFixed(2)}%
              </div>

            </div>

            <div className="accuracy-label">
              Accuracy
            </div>

          </div>

        </div>

      </main>

    </PageBackground>
  );
}

export default Results;