"use client";

import {useState} from "react";
import styles from "./page.module.css";

export default function ResultsPage(){
    const yourWords=[
        {word: "GARDEN", points: 2000},
        {word: "NERD", points: 400},
        {word: "RED", points: 100},
    ];

    const yourScore = yourWords.reduce(
        (total, item) => total + item.points, 0
    );

    // temporary??
    const opponentFinished = true;
    const opponentWords = [
        {word: "DRAGON", points: 2000},
        {word: "READ", points: 400},
        {word: "RAN", points: 100},
    ];

    const opponentScore = opponentWords.reduce(
        (total, item) => total + item.points, 0
    );

    const yourWon = yourScore > opponentScore;
    const youLost = yourScore < opponentScore;

    return(
        <main className={styles.page}>
            {yourWon && (
                <div className={`${styles.resultBanner} ${styles.loseBanner}`}>
                    YOU LOSE
                </div>
            )}

            {!yourWon && !youLost && opponentFinished && (
                <div className={`${styles.resultBanner} ${styles.tieBanner}`}>
                    TIE!
                </div>
            )}

            <div className={styles.players}>
                <section className={styles.playerSide}>
                    <h1 className={styles.playerName}>You</h1>
                    <div className={`${styles.avatar} ${
                        yourWon ? styles.winnerAvatar : ""
                        }`}
                    >
                        🤑
                    </div>

                    <div className={styles.scorePaper}>
                        <div className={styles.paperWords}>
                            WORDS: {yourWords.length}
                        </div>

                        <div className={styles.paperScore}>
                            SCORE: {yourScore.toString().padStart(4, "0")}
                        </div>
                    </div>

                    <div className={styles.wordListBox}>
                        {yourWords.map((item, index) => (
                            <div className={styles.wordRow} key={index}>
                                <div className={styles.wordCard}>
                                    {item.word}
                                </div>

                                <div className={styles.points}>
                                    +{item.points}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={styles.playerSide}>
                    <h1 className={styles.playerName}>
                        Opponent
                    </h1>

                    <div className={`${styles.avatar} ${youLost ? styles.loserAvatar : ""}`}>
                        👤
                    </div>

                    {opponentFinished ? (
                        <>
                        <div className={styles.scorePaper}>
                            <div className={styles.paperWords}>
                                WORDS: {opponentWords.length}
                            </div>

                            <div className={styles.paperScore}>
                                SCORE: {opponentScore
                                    .toString()
                                    .padStart(4, "0")
                                }
                            </div>
                        </div>

                        <div className={styles.wordListBox}>
                            {opponentWords.map((item, index) => (
                                <div className={styles.wordRow} key={index}>
                                    <div className={styles.wordCard}>
                                        {item.word}
                                    </div>

                                    <div className={styles.points}>
                                        +{item.points}
                                    </div>

                                </div>
                            ))}

                        </div>
                    </>
                ) : (
                    <div className={styles.waitingBox}>
                        Waiting...
                    </div>
                )}
                </section>
            </div>
            
            {!opponentFinished && (
                <div className={styles.bottomWaiting}>
                    WAITING FOR OPPONENT
                </div>
            )}
        </main>
    );
}