import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';

const previewConfig = {
  winChancePercent: 28,
  spinCost: 10,
  minSpinBet: 1,
  maxSpinBet: 100,
  payoutMultipliers: {
    twoMatch: 1.5,
    threeMatch: 4,
    jackpot: 12,
  },
};

const previewSymbols = ['sun', 'wave', 'star'];
const emojiMap = {
  sun: '☀',
  wave: '≈',
  star: '✦',
  moon: '☾',
  bolt: '⚡',
};
const fallbackSymbols = ['sun', 'wave', 'star', 'moon', 'bolt'];
const REEL_STOP_DELAYS = [1100, 1650, 2300];

const choose = (items) => items[Math.floor(Math.random() * items.length)];

const rollPreview = () => {
  const didWin = Math.random() * 100 < previewConfig.winChancePercent;

  if (didWin) {
    const jackpot = Math.random() < 0.2;
    const symbol = choose(previewSymbols);

    if (jackpot) {
      return {
        reels: [symbol, symbol, symbol],
        payout: Math.floor(previewConfig.spinCost * previewConfig.payoutMultipliers.jackpot),
        tier: 'jackpot',
      };
    }

    return {
      reels: [symbol, symbol, choose(previewSymbols.filter((item) => item !== symbol))],
      payout: Math.floor(previewConfig.spinCost * previewConfig.payoutMultipliers.twoMatch),
      tier: 'twoMatch',
    };
  }

  return {
    reels: ['sun', 'wave', 'star'],
    payout: 0,
    tier: 'loss',
  };
};

function SlotMachine({ token, config, onSpinComplete, preview = false }) {
  const slotConfig = config || previewConfig;
  const [reels, setReels] = useState(['sun', 'wave', 'star']);
  const [reelRows, setReelRows] = useState(() =>
    Array.from({ length: 3 }, (_, index) => buildStrip(['sun', 'wave', 'star'][index])),
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewBalance, setPreviewBalance] = useState(100);
  const [activeReels, setActiveReels] = useState([false, false, false]);
  const [marqueePhase, setMarqueePhase] = useState(0);
  const [betAmount, setBetAmount] = useState(() => (config || previewConfig).spinCost);
  const [celebrating, setCelebrating] = useState(false);
  const stateRef = useRef({
    reels: ['sun', 'wave', 'star'],
    loading: false,
    result: null,
    previewBalance: 100,
  });

  const syncState = (next) => {
    stateRef.current = {
      ...stateRef.current,
      ...next,
    };
  };
  const effectiveBetAmount = Math.min(
    slotConfig.maxSpinBet,
    Math.max(slotConfig.minSpinBet, betAmount || slotConfig.spinCost),
  );

  const animateSpinTo = useCallback((finalReels) => {
    const symbolPool = slotConfig.symbols?.length ? slotConfig.symbols : fallbackSymbols;

    setActiveReels([true, true, true]);

    finalReels.forEach((symbol, index) => {
      window.setTimeout(() => {
        setReelRows((current) =>
          current.map((reel, reelIndex) =>
            reelIndex === index ? buildStrip(symbol, symbolPool) : reel,
          ),
        );
        setReels((current) =>
          current.map((item, reelIndex) => (reelIndex === index ? symbol : item)),
        );
        setActiveReels((current) =>
          current.map((item, reelIndex) => (reelIndex === index ? false : item)),
        );
      }, REEL_STOP_DELAYS[index]);
    });
  }, [slotConfig.symbols]);

  const runSpin = useCallback(async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setResult(null);
    setCelebrating(false);
    syncState({ loading: true });
    setReelRows((current) =>
      current.map((reel, index) => buildStrip(reel[1] || fallbackSymbols[index])),
    );

    try {
      if (preview) {
        const previewResult = rollPreview();
        const adjustedPayout = Math.floor(
          effectiveBetAmount *
            (previewResult.tier === 'jackpot'
              ? previewConfig.payoutMultipliers.jackpot
              : previewResult.tier === 'threeMatch'
                ? previewConfig.payoutMultipliers.threeMatch
              : previewResult.tier === 'twoMatch'
                ? previewConfig.payoutMultipliers.twoMatch
                : 0),
        );
        const nextBalance = previewBalance - effectiveBetAmount + adjustedPayout;
        animateSpinTo(previewResult.reels);
        const nextResult = {
          ...previewResult,
          payout: adjustedPayout,
          spinCost: effectiveBetAmount,
          net: adjustedPayout - effectiveBetAmount,
          balance: nextBalance,
        };
        window.setTimeout(() => {
          setResult(nextResult);
          syncState({ result: nextResult });
          if (nextResult.net > 0) {
            setCelebrating(true);
          }
        }, REEL_STOP_DELAYS[REEL_STOP_DELAYS.length - 1] + 80);
        setPreviewBalance(nextBalance);
        syncState({
          reels: previewResult.reels,
          result: nextResult,
          previewBalance: nextBalance,
        });
        window.setTimeout(() => {
          setLoading(false);
          syncState({ loading: false });
        }, REEL_STOP_DELAYS[REEL_STOP_DELAYS.length - 1] + 100);
        window.setTimeout(() => {
          setCelebrating(false);
        }, REEL_STOP_DELAYS[REEL_STOP_DELAYS.length - 1] + 1900);
        return;
      }

      const data = await apiRequest(
        '/api/game/spin',
        {
          method: 'POST',
          body: JSON.stringify({ betAmount: effectiveBetAmount }),
        },
        token,
      );

      animateSpinTo(data.reels);
      syncState({ reels: data.reels, result: data });
      window.setTimeout(() => {
        setResult(data);
        onSpinComplete(data);
        if (data.net > 0) {
          setCelebrating(true);
        }
      }, REEL_STOP_DELAYS[REEL_STOP_DELAYS.length - 1] + 80);
      window.setTimeout(() => {
        setLoading(false);
        syncState({ loading: false });
      }, REEL_STOP_DELAYS[REEL_STOP_DELAYS.length - 1] + 100);
      window.setTimeout(() => {
        setCelebrating(false);
      }, REEL_STOP_DELAYS[REEL_STOP_DELAYS.length - 1] + 1900);
    } catch (error) {
      setResult({ error: error.message });
      syncState({ result: { error: error.message } });
      setLoading(false);
      syncState({ loading: false });
    }
  }, [animateSpinTo, effectiveBetAmount, loading, onSpinComplete, preview, previewBalance, token]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        runSpin();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    window.render_game_to_text = () =>
      JSON.stringify({
        mode: loading ? 'spinning' : 'idle',
        reels: stateRef.current.reels,
        result: stateRef.current.result,
        previewBalance: stateRef.current.previewBalance,
      });

    window.advanceTime = async (ms) =>
      new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [loading, reels, result, previewBalance, runSpin]);

  useEffect(() => {
    if (!loading) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setMarqueePhase((current) => (current + 1) % 4);
      setReelRows((current) =>
        current.map((reel, index) => {
          if (!activeReels[index]) {
            return reel;
          }

          return [...reel.slice(1), choose(slotConfig.symbols || fallbackSymbols)];
        }),
      );
    }, 80);

    return () => window.clearInterval(intervalId);
  }, [activeReels, loading, slotConfig.symbols]);

  const resultTone =
    result?.tier === 'jackpot'
      ? 'jackpot'
      : result?.payout > 0
        ? 'win'
        : result?.error
          ? 'error'
          : 'loss';
  const balanceValue = preview ? previewBalance : result?.balance;

  return (
    <div className={`game-card slot-card ${loading ? 'is-spinning' : ''} ${resultTone} ${celebrating ? 'celebrating' : ''}`}>
      <div className="slot-aura" aria-hidden="true" />
      <div className="slot-sheen" aria-hidden="true" />
      <div className="slot-burst-layer" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <span key={index} className="slot-spark" />
        ))}
      </div>
      <div className={`slot-marquee phase-${marqueePhase}`}>
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} className="slot-bulb" />
        ))}
      </div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Slot Floor</p>
          <h3>Solar Slots</h3>
        </div>
        <button id="start-btn" className="primary-button" onClick={runSpin} disabled={loading}>
          {loading ? 'Spinning...' : `Spin for ${effectiveBetAmount} pts`}
        </button>
      </div>

      <div className="bet-controls">
        <div className="bet-readout">
          <span>Bet amount</span>
          <strong>{effectiveBetAmount} pts</strong>
        </div>
        <input
          className="bet-slider"
          type="range"
          min={slotConfig.minSpinBet}
          max={slotConfig.maxSpinBet}
          step="1"
          value={effectiveBetAmount}
          onChange={(event) => setBetAmount(Number(event.target.value))}
          disabled={loading}
        />
        <div className="bet-scale">
          <small>{slotConfig.minSpinBet}</small>
          <small>{slotConfig.maxSpinBet}</small>
        </div>
      </div>

      <div className="slot-machine">
        <div className="slot-payline" aria-hidden="true" />
        {reelRows.map((symbols, index) => (
          <div
            key={`reel-${index}`}
            className={`slot-reel ${activeReels[index] ? 'spinning' : ''} ${
              result?.payout > 0 && reels[index] === reels[0] ? 'lit' : ''
            }`}
          >
            <div className="slot-window-glow" />
            <div className="slot-strip">
              {symbols.map((symbol, symbolIndex) => (
                <div
                  key={`${symbol}-${symbolIndex}-${index}`}
                  className={symbolIndex === 1 ? 'slot-symbol active' : 'slot-symbol'}
                >
                  <span className="slot-icon">
                    {emojiMap[symbol] || symbol.slice(0, 1).toUpperCase()}
                  </span>
                  <small>{symbol}</small>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="slot-console">
        <div className="console-readout">
          <span>Mode</span>
          <strong>{loading ? 'Spinning' : result?.tier || 'Ready'}</strong>
        </div>
        <div className="console-readout">
          <span>{preview ? 'Preview bank' : 'Live balance'}</span>
          <strong>{balanceValue ?? '--'} pts</strong>
        </div>
        <div className="console-readout lever">
          <span>Lever</span>
          <strong>{loading ? 'DOWN' : 'UP'}</strong>
        </div>
      </div>

      <div className="game-stats">
        <span>Win chance: {slotConfig.winChancePercent}%</span>
        <span>Bet range: {slotConfig.minSpinBet}-{slotConfig.maxSpinBet}</span>
        <span>2-match x{slotConfig.payoutMultipliers.twoMatch}</span>
        <span>3-match x{slotConfig.payoutMultipliers.threeMatch}</span>
        <span>Jackpot x{slotConfig.payoutMultipliers.jackpot}</span>
      </div>

      {result ? (
        <div className="slot-result">
          {result.error ? (
            <p className="error-banner">{result.error}</p>
          ) : (
            <>
              <div className="score-box">
                <span>{result.tier === 'loss' ? 'Spin result' : `Tier: ${result.tier}`}</span>
                <strong>{result.net >= 0 ? `+${result.net}` : result.net} pts</strong>
              </div>
              <div className="mini-grid">
                <div>
                  <small>Payout</small>
                  <strong>{result.payout}</strong>
                </div>
                <div>
                  <small>Balance</small>
                  <strong>{result.balance}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default SlotMachine;

function buildStrip(finalSymbol, symbolPool = fallbackSymbols) {
  const topSymbol = choose(symbolPool);
  const bottomChoices = symbolPool.filter((item) => item !== finalSymbol) || symbolPool;
  const bottomSymbol = choose(bottomChoices.length ? bottomChoices : symbolPool);

  return [topSymbol, finalSymbol, bottomSymbol];
}
