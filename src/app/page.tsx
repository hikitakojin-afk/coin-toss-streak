"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from 'next/dynamic'
import Image from "next/image"
import { toBlob } from "html-to-image"
import { CoinSide, setMasterVolume, masterVolume, playAmbientBGM, updateBGMVolume, resumeAudioContext } from "@/components/CoinGame"
import { cn } from "@/lib/utils"

const DynamicCoinGame = dynamic(
  () => import("@/components/CoinGame").then((mod) => mod.CoinGame),
  { ssr: false }
)

const getProbabilityInfo = (streak: number, lang: "en" | "ja") => {
  if (streak === 0) return null;
  const prob = Math.pow(0.5, streak);
  const probPercent = (prob * 100).toFixed(streak >= 10 ? 4 : 2);
  const formattedFraction = `1 / ${Math.pow(2, streak).toLocaleString()}`;

  let exampleJa = "";
  let exampleEn = "";

  switch (streak) {
    case 1: exampleJa = "コイントスで狙った面が出る確率 (1/2)"; exampleEn = "Flipping a specific face on a coin (1/2)"; break;
    case 2: exampleJa = "トランプのマークを当てる確率 (1/4)"; exampleEn = "Guessing a card suit (1/4)"; break;
    case 3: exampleJa = "サイコロで大体同じ目が出るくらいの確率 (1/8)"; exampleEn = "Guessing a 1-in-8 chance"; break;
    case 4: exampleJa = "ロシアンルーレットでハズレを引く確率より少し低い (1/16)"; exampleEn = "Rolling a specific number on a 16-sided die"; break;
    case 5: exampleJa = "クラスに同じ誕生日のペアがいる確率の半分 (1/32)"; exampleEn = "Guessing a roulette number (1/38)"; break;
    case 6: exampleJa = "一般的なガチャのPUキャラを単発で引く確率 (約1.5%)"; exampleEn = "Getting a critical hit in some RPGs (1.5%)"; break;
    case 7: exampleJa = "スマホを落として完全に画面が割れる確率くらい (1/128)"; exampleEn = "Pulling an SSR in a typical gacha game (~0.7%)"; break;
    case 8: exampleJa = "麻雀でチートイツをあがる確率 (1/256)"; exampleEn = "Getting a rare drop in an MMO (1/256)"; break;
    case 9: exampleJa = "3桁の暗証番号を1発で当てる確率の半分 (1/512)"; exampleEn = "Guessing a 3-digit pin code (1/1000) is close"; break;
    case 10: exampleJa = "10回連続で信号に引っかからない確率 (1/1024)"; exampleEn = "Winning a local raffle (1/1024)"; break;
    case 11: exampleJa = "街で偶然同姓同名の人に出会う確率 (1/2048)"; exampleEn = "Finding a wild shiny in newer games (1/4096) is close"; break;
    case 12: exampleJa = "四つ葉のクローバーを1発で見つける確率に近い (1/4096)"; exampleEn = "Finding a four-leaf clover easily"; break;
    case 13: exampleJa = "昔のポケモンで色違いに遭遇する確率 (1/8192)"; exampleEn = "Finding a shiny Pokémon in older generations (1/8192)"; break;
    case 14: exampleJa = "アマチュアがゴルフでホールインワンを出す確率 (約1/12000)"; exampleEn = "Amateur getting a hole-in-one in golf (~1/12000)"; break;
    case 15: exampleJa = "飛行機が墜落する確率 (約1/3万)"; exampleEn = "Odds of a plane crash (~1/30,000)"; break;
    case 16: exampleJa = "クイント・フラッシュが出る確率 (約1/6.5万)"; exampleEn = "Getting a straight flush (~1/65,000)"; break;
    case 17: exampleJa = "宝くじで100万円が当たる確率 (1/13万)"; exampleEn = "Winning $10,000 in a scratch-off"; break;
    case 18: exampleJa = "隕石が頭に落ちてくる確率 (約1/25万)"; exampleEn = "Hit by a meteorite (~1/250,000)"; break;
    case 19: exampleJa = "雷に打たれて死ぬ確率 (約1/50万)"; exampleEn = "Dying from a lightning strike (~1/500,000)"; break;
    case 20: exampleJa = "麻雀で天和をあがる確率より少し高い (1/100万)"; exampleEn = "Flipping 20 heads in a row (1/1M)"; break;
    case 21: exampleJa = "カジノのジャックポットを引き当てる確率 (1/200万)"; exampleEn = "Hitting a slot machine jackpot (1/2M)"; break;
    case 22: exampleJa = "一生のうちに全く同じ指紋の人と出会う確率 (1/400万)"; exampleEn = "Finding identical fingerprints (1/4M)"; break;
    case 23: exampleJa = "サメに襲われる確率 (約1/800万)"; exampleEn = "Being attacked by a shark (1/8M)"; break;
    case 24: exampleJa = "ジャンボ宝くじの1等に当選する確率 (1/1000万)より低い"; exampleEn = "Winning a major lottery jackpot (>1/10M)"; break;
    case 25: exampleJa = "大統領になる確率 (約1/3000万)"; exampleEn = "Becoming the President (1/30M)"; break;
    case 26: exampleJa = "宇宙ゴミが直撃する確率 (約1/6000万)"; exampleEn = "Hit by space debris (1/60M)"; break;
    case 27: exampleJa = "自動販売機の下に1万円札が落ちている確率 (約1/1億)"; exampleEn = "Finding $100 under a vending machine (1/100M)"; break;
    case 28: exampleJa = "猿がデタラメに打って「ハムレット」の一節を作る確率"; exampleEn = "Monkey typing a Shakespeare line (1/250M)"; break;
    case 29: exampleJa = "地球に巨大隕石が衝突する確率 (1/5億)"; exampleEn = "Earth hit by a massive meteor (1/500M)"; break;
    case 30: exampleJa = "10億人の中からピンポイントで1人選ばれる確率"; exampleEn = "Selected randomly from 1 billion people"; break;
    case 31: exampleJa = "一生に2回、雷に直撃される確率 (1/20億)"; exampleEn = "Struck by lightning twice (1/2B)"; break;
    case 32: exampleJa = "メガミリオンズで特賞を当てるより難しい (1/42億)"; exampleEn = "Winning Mega Millions (1/4.2B)"; break;
    case 33: exampleJa = "全世界の人間から全く無作為にあなただけが選ばれる確率 (1/80億)以下"; exampleEn = "You specifically chosen from all humans (1/8B) is higher"; break;
    case 34: exampleJa = "世界中全員が同時にくしゃみをする確率"; exampleEn = "Everyone on Earth sneezing at once"; break;
    case 35: exampleJa = "宝くじで1等を2回連続で当てる確率の領域"; exampleEn = "Winning the lottery jackpot twice in a row"; break;
    case 36: exampleJa = "砂漠から特定の砂粒を1つ見つけ出す確率"; exampleEn = "Finding a specific grain of sand in a desert"; break;
    case 37: exampleJa = "ランダムにシャッフルしたトランプが新品と同じ並びになる確率(の一部)"; exampleEn = "A perfectly sorted deck from random shuffle (part of it)"; break;
    case 38: exampleJa = "ゴルフでホールインワンを連続で3回出す確率"; exampleEn = "Three hole-in-ones in a row in golf"; break;
    case 39: exampleJa = "同じ隕石が2回、同じ人の頭に落ちる確率"; exampleEn = "Same meteor hitting the same person twice"; break;
    case 40: exampleJa = "地球上のすべてのアリの中から特定の1匹を見つけ出す確率"; exampleEn = "Finding one specific ant out of all ants on Earth"; break;
    case 41: exampleJa = "宇宙空間のデブリが数万km離れた別のデブリに偶然衝突する確率"; exampleEn = "Space debris colliding purely by chance"; break;
    case 42: exampleJa = "地球上のすべての人間が同じ瞬間に瞬きをするレベル"; exampleEn = "Everyone on Earth blinking at the same exact millisecond"; break;
    case 43: exampleJa = "全人類の指紋が偶然一致するレベルの奇跡"; exampleEn = "All humans having the exact same fingerprint by chance"; break;
    case 44: exampleJa = "ジャンボ宝くじで1等を4回連続で当てるような奇跡"; exampleEn = "Winning the lottery jackpot four times in a row"; break;
    case 45: exampleJa = "歴史上のすべての出来事が全く同じ順序で別次元で起こる確率"; exampleEn = "All historical events happening identically in a parallel universe"; break;
    case 46: exampleJa = "海の水を全部ティースプーンですくう労力に匹敵する確率"; exampleEn = "Emptying the ocean with a teaspoon"; break;
    case 47: exampleJa = "ランダムなキーボード入力でWindowsのOSを丸ごと書き上げる確率"; exampleEn = "Typing an entire OS perfectly by smashing the keyboard"; break;
    case 48: exampleJa = "太陽系外から飛んできた小惑星が地球のリンゴに直撃する確率"; exampleEn = "Interstellar asteroid hitting exactly one apple on Earth"; break;
    case 49: exampleJa = "宇宙の全原子の中から特定のものを引き当てるような奇跡"; exampleEn = "Picking a specific atom from the entire universe"; break;
    case 50: exampleJa = "神がサイコロを振ることすら放棄する確率"; exampleEn = "A probability so low even God stops rolling dice"; break;
    default: exampleJa = "人間の理解を超えた、天文学的な奇跡の領域"; exampleEn = "An astronomical miracle beyond human comprehension"; break;
  }

  return { probPercent, formattedFraction, example: lang === "ja" ? exampleJa : exampleEn };
}

export default function Home() {
  const [lang, setLang] = useState<"en" | "ja">("ja")
  const [streak, setStreak] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [targetSide, setTargetSide] = useState<CoinSide | null>(null)
  const [volume, setVolume] = useState(masterVolume)
  const [username, setUsername] = useState<string | null>("loading") // internal loading state
  const [tempUsername, setTempUsername] = useState("")
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)
  const [leaderboard, setLeaderboard] = useState<{ username: string, score: number }[]>([])

  useEffect(() => {
    const savedScore = localStorage.getItem("coin_toss_highscore")
    if (savedScore) setHighScore(parseInt(savedScore, 10))

    const savedName = localStorage.getItem("coin_toss_username")
    if (savedName) {
      setUsername(savedName)
    } else {
      setUsername(null) // trigger modal
    }

    const playAudio = () => {
      playAmbientBGM()
      resumeAudioContext()
      updateBGMVolume(volume)
    }
    document.addEventListener("click", playAudio, { once: true })
    document.addEventListener("pointerup", playAudio, { once: true })
    return () => {
      document.removeEventListener("click", playAudio)
      document.removeEventListener("pointerup", playAudio)
    }
  }, [])

  useEffect(() => {
    updateBGMVolume(volume)
  }, [volume])

  const handleTossStarted = () => {
    if (username === null || username === "loading") return // block toss if no name
    playAmbientBGM()
    resumeAudioContext()
  }

  const handleStreakUpdate = (newStreak: number, side: CoinSide | null) => {
    setTargetSide(side)

    if (newStreak === 0) {
      const currentHighest = Math.max(streak, highScore)
      if (streak > 0 && username && username !== "loading") {
        fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, score: currentHighest })
        }).catch(console.error);
      }
      if (currentHighest > highScore) {
        setHighScore(currentHighest)
        localStorage.setItem("coin_toss_highscore", currentHighest.toString())
      }
      setStreak(0)
    } else {
      setStreak(newStreak)
    }
  }

  const [isCapturing, setIsCapturing] = useState(false)

  const handleShareClick = async () => {
    const displayScore = Math.max(streak, highScore);

    const text = lang === "ja"
      ? `コイントスチャレンジで${displayScore}回連続成功！🪙 あなたはこれを超えられるかな？ トップランカー目指して挑戦しよう！`
      : `I got a ${displayScore} streak in the Coin Toss Challenge! 🪙 Can you beat me?`;
    const url = "https://coin-toss-streak.vercel.app"
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`

    // Only attempt native image sharing with screenshot if we are on a Mobile device where the share sheet is reliable.
    // Desktop browsers often block async popups or falsely report `canShare`.
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (!isMobile || !navigator.share) {
      window.open(shareUrl, "_blank")
      return
    }

    // If mobile/native share IS supported, capture image and trigger native share sheet
    setIsCapturing(true)
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      const targetEl = document.getElementById('share-capture-zone') || document.body

      const imageBlob = await toBlob(targetEl, {
        backgroundColor: '#0a0600',
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
        }
      })

      setIsCapturing(false)

      if (imageBlob) {
        const file = new File([imageBlob], 'cointoss_score.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Coin Toss Streak',
            text: `${text}\n${url}`,
            files: [file]
          })
        }
      }
    } catch (e) {
      setIsCapturing(false)
      console.error("Screenshot capture failed", e)
      window.open(shareUrl, "_blank") // Fallback just in case
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const val = parseFloat(e.target.value)
    setVolume(val)
    setMasterVolume(val)
    updateBGMVolume(val)
    playAmbientBGM()
    resumeAudioContext()
  }

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault()
    if (tempUsername.trim().length > 0) {
      const name = tempUsername.trim().slice(0, 15) // limit length
      localStorage.setItem("coin_toss_username", name)
      setUsername(name)
      playAmbientBGM()
      resumeAudioContext()
    }
  }

  const openLeaderboard = async () => {
    setIsLeaderboardOpen(true)
    try {
      const res = await fetch('/api/leaderboard')
      if (res.ok) {
        setLeaderboard(await res.json())
      }
    } catch (e) { }
  }

  const probInfo = getProbabilityInfo(streak, lang)

  return (
    <main className="min-h-[100dvh] w-full flex flex-col items-center justify-between text-yellow-100 uppercase overflow-hidden relative bg-[#0a0600]" onClick={handleTossStarted}>

      {/* Removed Audio Tag, using Web Audio API instead */}

      {/* Dark Ambient Background Gradient */}
      <div className="absolute inset-0 bg-radial-gradient from-[#2c1a05] via-[#0f0902] to-black opacity-90 pointer-events-none" />

      {/* Coin Game WebGL Canvas */}
      <DynamicCoinGame
        onStreakUpdate={handleStreakUpdate}
        streak={streak}
        targetSide={targetSide}
        onTossStarted={handleTossStarted}
      />

      <div id="share-capture-zone" className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between z-10">

        {/* Header / Scoreboard */}
        <header className="w-full p-6 flex flex-col items-center z-50 mt-20 pointer-events-none relative">
          <div className="flex justify-center w-full px-4 mb-4">
            <div className="flex flex-col items-center bg-black/40 px-6 py-2 rounded-full border border-amber-500/20 backdrop-blur-md">
              <span className="text-[10px] uppercase tracking-widest text-amber-300/70 drop-shadow-md">
                {lang === "ja" ? "ハイスコア" : "High Score"}
              </span>
              <span className="text-xl font-black drop-shadow-lg text-amber-100">{highScore}</span>
            </div>
          </div>

          {/* Streak Layout (Updated layout as requested) */}
          <div className="flex flex-col items-center relative w-full px-4 mt-2">

            <div className="flex flex-col items-center">
              {/* 1. Label strictly placed above */}
              <span className="text-sm md:text-base uppercase tracking-[0.2em] font-bold text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-2 bg-black/50 px-6 py-1 rounded-full border border-amber-500/30 backdrop-blur-md select-none">
                {lang === "ja" ? "現在のストリーク" : "Current Streak"}
              </span>

              {/* 2. Streak Number strictly below the label with a relative wrapper */}
              <div className="relative flex items-center justify-center">
                <h1 className={cn(
                  "text-[8rem] md:text-[10rem] leading-none font-black tabular-nums tracking-tighter transition-all duration-300 text-amber-300 drop-shadow-[0_0_40px_rgba(251,191,36,0.6)] select-none",
                  streak > 0 && streak % 10 === 0 ? "scale-110" : "scale-100"
                )}>
                  {streak}
                </h1>

                {/* 3. Small Target Coin Badge placed at the top-right of the number */}
                {targetSide && streak > 0 && (
                  <div className="absolute top-2 right-0 translate-x-[90%] md:translate-x-[110%] animate-in fade-in zoom-in slide-in-from-left-4">
                    <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full border-4 border-amber-400 overflow-hidden shadow-[0_0_25px_rgba(251,191,36,0.6)]">
                      <Image
                        src={targetSide === 'heads' ? '/textures/heads.png' : '/textures/tails.png'}
                        alt={targetSide}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Debug Controls */}
            {process.env.NODE_ENV !== "production" && (
              <div className="absolute top-10 right-4 translate-y-24 z-50 pointer-events-auto flex flex-col gap-2 pointer-events-auto">
                <button
                  onClick={() => handleStreakUpdate(streak + 1, targetSide || "heads")}
                  className="bg-red-500/50 hover:bg-red-500/80 backdrop-blur-sm text-white px-3 py-1 text-xs rounded-full border border-red-400 opacity-50 hover:opacity-100 transition-opacity"
                  title="Debug: +1 Streak"
                >
                  [DEBUG] +1 Streak
                </button>
                <button
                  onClick={() => {
                    setStreak(0)
                    setTargetSide(null)
                  }}
                  className="bg-blue-500/50 hover:bg-blue-500/80 backdrop-blur-sm text-white px-3 py-1 text-xs rounded-full border border-blue-400 opacity-50 hover:opacity-100 transition-opacity"
                  title="Debug: Reset Streak"
                >
                  [DEBUG] Reset Streak
                </button>
                <button
                  onClick={() => {
                    setHighScore(0)
                    localStorage.removeItem("coin_toss_highscore")
                  }}
                  className="bg-purple-500/50 hover:bg-purple-500/80 backdrop-blur-sm text-white px-3 py-1 text-xs rounded-full border border-purple-400 opacity-50 hover:opacity-100 transition-opacity"
                  title="Debug: Reset Highscore"
                >
                  [DEBUG] Reset Highscore
                </button>
              </div>
            )}

          </div>
        </header>

        {/* Probability Info (Bottom Screen) */}
        {probInfo && (
          <div className="absolute bottom-10 py-6 left-0 right-0 flex flex-col items-center pointer-events-none z-20 px-4 animate-in fade-in slide-in-from-bottom-4 transition-all duration-500">
            <div className="bg-black/60 backdrop-blur-md border border-amber-500/30 px-6 py-5 rounded-2xl w-full max-w-md flex flex-col items-center gap-3 shadow-2xl transition-all">
              <span className="text-amber-400/80 text-xs tracking-widest uppercase font-semibold border-b border-amber-500/30 pb-1">
                {lang === "ja" ? "連続成功の確率" : "Probability"}
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-amber-300 tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">
                  {probInfo.probPercent}%
                </span>
                <span className="text-amber-100 font-mono text-sm tabular-nums">
                  ({probInfo.formattedFraction})
                </span>
              </div>
              <div className="text-amber-200/90 text-sm md:text-base text-center mt-1 leading-relaxed w-full font-medium bg-amber-950/40 p-3 rounded-xl border border-amber-500/20 shadow-inner">
                {probInfo.example}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Left Volume Controls - Hidden during capture */}
      {!isCapturing && (
        <div className="absolute top-6 left-6 z-50 flex items-center gap-3 bg-black/50 backdrop-blur-md px-4 py-3 rounded-full border border-amber-500/30 w-48 shadow-lg pointer-events-auto" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
          <span className="text-xl leading-none">{volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>
      )}

      {/* Top Right UI Controls - Hidden during capture */}
      {!isCapturing && (
        <div className="absolute top-6 right-6 z-50 flex gap-4 pointer-events-auto" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
          <button
            onClick={openLeaderboard}
            className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-amber-500/30 text-amber-100 px-3 py-2 rounded-full font-bold flex items-center justify-center transition-all shadow-lg active:scale-95 text-xl w-12 h-10 cursor-pointer"
          >
            🏆
          </button>
          <button
            onClick={() => setLang(l => l === "en" ? "ja" : "en")}
            className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-amber-500/30 text-amber-100 px-3 py-2 rounded-full font-bold flex items-center justify-center transition-all shadow-lg active:scale-95 text-xs w-12 h-10 cursor-pointer uppercase tracking-wider"
          >
            {lang}
          </button>
          <button
            onClick={handleShareClick}
            className="bg-amber-600/20 hover:bg-amber-600/40 backdrop-blur-md border border-amber-500/40 text-amber-100 px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 text-sm cursor-pointer"
          >
            {isCapturing ? (lang === "ja" ? "処理中..." : "Processing...") : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                {lang === "ja" ? "スクショしてシェア" : "Share Screenshot"}
              </>
            )}
          </button>
        </div>
      )}

      {/* Creator Link */}
      <a
        href="https://x.com/ChoroUduki"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-6 z-50 text-xs font-mono text-amber-500/50 hover:text-amber-400 transition-colors pointer-events-auto"
      >
        Created by @ChoroUduki
      </a>

      {/* Name Entry Modal (Locks game) */}
      {username === null && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <form onSubmit={handleSaveUsername} className="bg-gradient-to-br from-amber-950/80 to-[#110a05] border border-amber-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(251,191,36,0.15)] flex flex-col items-center gap-6 max-w-sm w-full mx-4">
            <h2 className="text-2xl font-black text-amber-100 tracking-wider text-center">{lang === "ja" ? "プレイヤー名を入力" : "Enter Player Name"}</h2>
            <div className="w-full">
              <input
                type="text"
                value={tempUsername}
                onChange={e => setTempUsername(e.target.value)}
                maxLength={15}
                placeholder={lang === "ja" ? "名前 (15文字以内)" : "Name (max 15 chars)"}
                className="w-full bg-black/50 border border-amber-500/50 rounded-lg px-4 py-3 text-amber-100 text-center text-lg focus:outline-none focus:border-amber-300 transition-colors"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={tempUsername.trim().length === 0}
              className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-black py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(251,191,36,0.4)]"
            >
              {lang === "ja" ? "プレイ開始" : "Start Playing"}
            </button>
          </form>
        </div>
      )}

      {/* Leaderboard Panel */}
      {isLeaderboardOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto" onClick={() => setIsLeaderboardOpen(false)}>
          <div className="bg-gradient-to-br from-[#1a1005] to-[#0a0500] border border-amber-500/40 w-full max-w-md max-h-[80vh] rounded-2xl shadow-2xl flex flex-col transform transition-all overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-amber-500/20 flex justify-between items-center bg-black/40">
              <div className="flex items-center justify-between w-full"> {/* Added w-full here */}
                <h2 className="text-xl font-black text-amber-300 flex items-center gap-2">🏆 {lang === "ja" ? "リーダーボード" : "Leaderboard"}</h2>
                <div className="flex items-center gap-2">
                  {process.env.NODE_ENV !== "production" && (
                    <button
                      onClick={async () => {
                        await fetch('/api/leaderboard', { method: 'DELETE' });
                        openLeaderboard(); // refresh UI
                      }}
                      className="text-xs bg-red-900/40 hover:bg-red-800 text-red-200 px-3 py-1 rounded transition-colors mr-2 border border-red-500/50"
                      title="Debug: Clear remote DB"
                    >
                      [DEBUG] Clear DB
                    </button>
                  )}
                  <button onClick={() => setIsLeaderboardOpen(false)} className="text-amber-500/70 hover:text-amber-300 p-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent">
              <div className="flex justify-between items-center px-4 py-2 text-xs font-bold text-amber-500/60 uppercase tracking-widest border-b border-amber-500/10 mb-2">
                <span>{lang === "ja" ? "順位 / プレイヤー" : "Rank / Player"}</span>
                <span>{lang === "ja" ? "ハイスコア" : "High Score"}</span>
              </div>
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-amber-500/50">{lang === "ja" ? "まだ記録がありません" : "No records yet"}</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {leaderboard.map((entry, idx) => (
                    <div key={idx} className={cn(
                      "flex items-center justify-between p-3 rounded-lg transition-colors border",
                      idx === 0 ? "bg-yellow-500/10 border-yellow-500/30" :
                        idx === 1 ? "bg-slate-300/10 border-slate-300/20" :
                          idx === 2 ? "bg-amber-700/10 border-amber-700/20" : "bg-transparent border-transparent"
                    )}>
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          "font-black w-6 text-center text-sm",
                          idx === 0 ? "text-yellow-400" :
                            idx === 1 ? "text-slate-300" :
                              idx === 2 ? "text-amber-600" : "text-amber-500/40"
                        )}>{idx + 1}</span>
                        <span className="font-bold text-amber-100 max-w-[150px] truncate">{entry.username}</span>
                      </div>
                      <div className="font-black text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]">{entry.score}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
