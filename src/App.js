import React, { useState, useEffect } from "react";

// --- CONFIGURAÇÃO SEGURA (Variáveis definidas na Vercel) ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL
};

const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD;

// --- RESTANTE DO CÓDIGO ---

let db = null;
let firebaseRef = null;
let firebaseSet = null;
let firebasePush = null;
let firebaseOnValue = null;
let firebaseOff = null;

const PRIZE_ROUND = "Limpeza de Pele de Porcelana";
const PRIZE_RANKING = "Grande Prêmio Especial";
const USER_SESSION_KEY = "desafio_copa_user_session";

const FLAG_MAP = {
  "estados unidos": "us", "usa": "us", "méxico": "mx", "mexico": "mx", "canadá": "ca", "canada": "ca",
  "argentina": "ar", "brasil": "br", "brazil": "br", "colômbia": "co", "colombia": "co", "chile": "cl",
  "equador": "ec", "ecuador": "ec", "paraguai": "py", "paraguay": "py", "peru": "pe", "uruguai": "uy", 
  "uruguay": "uy", "venezuela": "ve", "panamá": "pa", "panama": "pa", "costa rica": "cr", "jamaica": "jm", 
  "honduras": "hn", "alemanha": "de", "germany": "de", "bélgica": "be", "croácia": "hr", "dinamarca": "dk", 
  "espanha": "es", "frança": "fr", "inglaterra": "gb-eng", "itália": "it", "holanda": "nl", "portugal": "pt", 
  "república tcheca": "cz", "suécia": "se", "suíça": "ch", "polônia": "pl", "turquia": "tr", "áfrica do sul": "za", 
  "africa do sul": "za", "marrocos": "ma", "egito": "eg", "gana": "gh", "nigéria": "ng", "senegal": "sn", 
  "austrália": "au", "japão": "jp", "coréia do sul": "kr", "arábia saudita": "sa", "irã": "ir", "nova zelândia": "nz"
};

function getFlagCode(teamName) {
  if (!teamName) return "un";
  const normalized = teamName.toLowerCase().trim();
  return FLAG_MAP[normalized] || "un";
}

function formatName(str) {
  if (!str) return "";
  return str.toLowerCase().split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

const DEFAULT_ROUND = {
  title: "Rodada 1",
  deadline: "2026-06-11T16:00", 
  games: [
    { id: 1, home: { name: "México", code: "mx" }, away: { name: "África do Sul", code: "za" }, date: "Jogo de Abertura - 11/06 às 16:00" },
    { id: 2, home: { name: "Brasil", code: "br" }, away: { name: "Marrocos", code: "ma" }, date: "Fase de Grupos - 1ª Rodada" },
    { id: 3, home: { name: "Estados Unidos", code: "us" }, away: { name: "Paraguai", code: "py" }, date: "Fase de Grupos - 1ª Rodada" }
  ]
};

function ScoreInput({ value, onChange, disabled }) {
  return (
    <div className="score-input-wrap">
      <button className="score-btn" onClick={() => onChange(Math.max(0, value - 1))} type="button" disabled={disabled}>−</button>
      <span className="score-number">{value}</span>
      <button className="score-btn" onClick={() => onChange(Math.min(20, value + 1))} type="button" disabled={disabled}>+</button>
    </div>
  );
}

function GameCard({ game, scores, onScoreChange, disabled }) {
  return (
    <div className="game-card">
      <div className="game-date">{game.date}</div>
      <div className="matchup">
        <div className="team team-left">
          <img src={`https://flagcdn.com/w160/${game.home.code}.png`} alt={game.home.name} className="flag-img" />
          <span className="team-name">{game.home.name.toUpperCase()}</span>
        </div>
        <div className="vs-center">
          <div className="score-controls">
            <ScoreInput value={scores.home} onChange={(v) => onScoreChange(game.id, "home", v)} disabled={disabled} />
            <span className="score-sep">×</span>
            <ScoreInput value={scores.away} onChange={(v) => onScoreChange(game.id, "away", v)} disabled={disabled} />
          </div>
        </div>
        <div className="team team-right">
          <img src={`https://flagcdn.com/w160/${game.away.code}.png`} alt={game.away.name} className="flag-img" />
          <span className="team-name">{game.away.name.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

function CountdownTimer({ deadline, onExpire }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline) return;
    const calculateTime = () => {
      const difference = +new Date(deadline) - +new Date();
      if (difference <= 0) {
        setTimeLeft("Palpites Encerrados");
        setIsExpired(true);
        if (onExpire) onExpire(true);
        return;
      }
      const minutesTotal = Math.floor(difference / 1000 / 60);
      setIsUrgent(minutesTotal <= 60);

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      let text = "";
      if (days > 0) text += `${days}d `;
      text += `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
      setTimeLeft(text);
    };
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <div className={`countdown-box ${isExpired ? "expired" : isUrgent ? "urgent-pulsing" : ""}`}>
      <span className="timer-label">{isUrgent ? "Prazo Limite Próximo" : "Tempo Restante para Envio"}</span>
      <span className="timer-clock">{timeLeft}</span>
    </div>
  );
}

function ParticipantForm({ round, entries, ready }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [scores, setScores] = useState({ 1: { home: 0, away: 0 }, 2: { home: 0, away: 0 }, 3: { home: 0, away: 0 } });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTimeOver, setIsTimeOver] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(USER_SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setName(parsed.name ? formatName(parsed.name) : "");
      setPhone(parsed.phone || "");
    }
  }, []);

  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = () => {
    if (!ready || !db) { setError("Aguardando conexão estável com o servidor."); return; }
    if (isTimeOver) { setError("O prazo final de envio foi encerrado para esta rodada."); return; }
    if (!name.trim()) { setError("O preenchimento do nome completo é obrigatório."); return; }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) { setError("Informe um número de WhatsApp válido."); return; }
    setError("");
    setLoading(true);

    const alreadyVoted = entries.find(e => e.phoneDigits === phoneDigits && e.roundTitle === round.title);
    if (alreadyVoted) {
      setError(`Este número de WhatsApp já registrou palpite para a ${round.title}.`);
      setLoading(false);
      return;
    }

    const formattedName = formatName(name.trim());
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify({ name: formattedName, phone }));
    
    const newEntry = { 
      roundTitle: round.title, 
      name: formattedName, 
      phone, 
      phoneDigits, 
      scores, 
      createdAt: new Date().toISOString(),
      disqualifiedRounds: {},
      bonusPoints: 0
    };

    firebaseSet(firebasePush(firebaseRef(db, "entries")), newEntry).then(() => {
      setSubmitted(true);
      setLoading(false);
    }).catch(() => {
      setError("Erro interno ao salvar os dados na nuvem.");
      setLoading(false);
    });
  };

  if (submitted) {
    return (
      <div className="success-screen">
        <div className="success-icon-wrap">✔</div>
        <h2>Palpite Confirmado com Sucesso</h2>
        <p className="success-welcome">Agradecemos a participação, <strong>{formatName(name.split(" ")[0])}</strong>.</p>
        
        <div className="prize-info">
          <strong>Formas de Ganhar no Nosso Desafio:</strong><br/>
          • <strong>Na Rodada:</strong> Acertando os 3 placares exatos desta rodada ativa, você ganha o prêmio direto de uma <strong>{PRIZE_ROUND}</strong>.<br/>
          • <strong>No Ranking Geral:</strong> Os seus acertos individuais somam pontos corridos na tabela. Ao final do campeonato, quem acumular a maior pontuação leva o <strong>{PRIZE_RANKING}</strong>.
        </div>

        <div className="summary-box">
          <h3>Seus Palpites Registrados</h3>
          {round.games.map((g) => (
            <div key={g.id} className="summary-card">
              <div className="summary-match-row">
                <div className="summary-team-side summary-left">
                  <img src={`https://flagcdn.com/w40/${g.home.code}.png`} className="summary-flag" alt="" />
                  <span>{g.home.name.toUpperCase()}</span>
                </div>
                <div className="summary-score-display">{scores[g.id].home} <span>×</span> {scores[g.id].away}</div>
                <div className="summary-team-side summary-right">
                  <span>{g.away.name.toUpperCase()}</span>
                  <img src={`https://flagcdn.com/w40/${g.away.code}.png`} className="summary-flag" alt="" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="form-section">
      <CountdownTimer deadline={round.deadline} onExpire={setIsTimeOver} />
      {isTimeOver ? (
        <div className="lockout-box"><p>Palpites Bloqueados. Horário limite atingido para esta rodada.</p></div>
      ) : (
        <>
          <div className="form-fields">
            <input className="field-input" placeholder="Nome Completo" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="field-input" placeholder="WhatsApp com DDD" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="numeric" />
          </div>
          <div className="games-list">
            {round.games.map((game) => (
              <GameCard key={game.id} game={game} scores={scores[game.id]} onScoreChange={(gId, side, v) => setScores(p => ({...p, [gId]: {...p[gId], [side]: v}}))} disabled={isTimeOver} />
            ))}
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="submit-btn" onClick={handleSubmit} disabled={loading || !ready}>
            {!ready ? "Conectando ao servidor..." : loading ? "Processando Envio..." : "Confirmar Meus Palpites"}
          </button>
        </>
      )}
    </div>
  );
}

function RankingTab({ entries, resultsHistory }) {
  const rankingMap = {};
  entries.forEach((entry) => {
    const key = entry.phoneDigits;
    if (!key) return;
    
    if (!rankingMap[key]) {
      rankingMap[key] = { name: formatName(entry.name), totalPoints: entry.bonusPoints || 0, roundsPlayed: new Set() };
    }
    
    rankingMap[key].roundsPlayed.add(entry.roundTitle);

    const isDisqualified = entry.disqualifiedRounds && entry.disqualifiedRounds[entry.roundTitle];
    const realResult = resultsHistory[entry.roundTitle];
    
    if (realResult && !isDisqualified) {
      [1, 2, 3].forEach((gameId) => {
        const gameReal = realResult[gameId];
        const gameUser = entry.scores[gameId];
        if (gameReal && gameReal.home !== "" && gameReal.away !== "") {
          if (parseInt(gameReal.home) === gameUser.home && parseInt(gameReal.away) === gameUser.away) {
            rankingMap[key].totalPoints += 1;
          }
        }
      });
    }
  });

  const sortedRanking = Object.values(rankingMap).sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className="ranking-container">
      <h3 className="section-title">Classificação Geral Acumulada</h3>
      <p className="ranking-desc">Cada placar cravado integralmente concede 1 ponto na tabela geral.</p>
      <div className="ranking-table">
        {sortedRanking.map((user, index) => (
          <div key={index} className={`ranking-row ${index === 0 ? "podium-1" : ""}`}>
            <div className="ranking-position">
              {index === 0 ? "1º" : `${index + 1}º`}
            </div>
            <div className="ranking-user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-phone-sub">Participações: {user.roundsPlayed.size}</span>
            </div>
            <div className="ranking-score-total"><strong>{user.totalPoints}</strong> Pontos</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HallFamaTab({ entries, resultsHistory, blacklistHall }) {
  const allWinners = [];

  const roundTitles = Array.from(new Set(entries.map(e => e.roundTitle)));
  
  roundTitles.forEach(title => {
    const activeResults = resultsHistory[title];
    if (activeResults) {
      const roundEntries = entries.filter(e => e.roundTitle === title);
      roundEntries.forEach(entry => {
        if (blacklistHall && blacklistHall[entry.phoneDigits]) return; 
        const isDisqualified = entry.disqualifiedRounds && entry.disqualifiedRounds[title];
        if (isDisqualified) return;

        let perfect = true;
        [1, 2, 3].forEach(id => {
          const r = activeResults[id]; const p = entry.scores[id];
          if (!r || r.home === "" || r.away === "" || parseInt(r.home) !== p.home || parseInt(r.away) !== p.away) {
            perfect = false;
          }
        });
        if (perfect) {
          allWinners.push({ name: formatName(entry.name), roundTitle: title });
        }
      });
    }
  });

  return (
    <div className="ranking-container">
      <h3 className="section-title" style={{textAlign:'center'}}>Galeria de Destaques - Ganhadores(as)</h3>
      {allWinners.length === 0 ? (
        <p className="no-data">Nenhum registro de acerto total computado até o momento.</p>
      ) : (
        <div className="ranking-table">
          {allWinners.map((w, idx) => (
            <div key={idx} className="ranking-row highlight-premium">
              <div className="ranking-position">★</div>
              <div className="ranking-user-info">
                <span className="user-name">{w.name}</span>
                <span className="user-phone-sub">Gabarito completo na {w.roundTitle}</span>
              </div>
              <div className="premium-badge-hall">{PRIZE_ROUND}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPanel({ onLogout, round, entries, resultsHistory, blacklistHall }) {
  const [newRoundTitle, setNewRoundTitle] = useState("");
  const [roundDeadline, setRoundDeadline] = useState(""); 
  const [g1Home, setG1Home] = useState(""); const [g1Away, setG1Away] = useState("");
  const [g2Home, setG2Home] = useState(""); const [g2Away, setG2Away] = useState("");
  const [g3Home, setG3Home] = useState(""); const [g3Away, setG3Away] = useState("");
  const [currentResults, setCurrentResults] = useState({ 1: { home: "", away: "" }, 2: { home: "", away: "" }, 3: { home: "", away: "" } });
  const [confirmPass, setConfirmPass] = useState("");
  const [modTargetPhone, setModTargetPhone] = useState("");
  const [modPoints, setModPoints] = useState("0");

  useEffect(() => {
    if (resultsHistory[round.title]) setCurrentResults(resultsHistory[round.title]);
  }, [round, resultsHistory]);

  const saveResults = () => {
    firebaseSet(firebaseRef(db, `resultsHistory/${round.title}`), currentResults).then(() => alert("Resultados oficiais armazenados com sucesso."));
  };

  const toggleDisqualifyRound = (entryRaw) => {
    const entriesRef = firebaseRef(db, "entries");
    entriesRef.once("value").then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        const key = Object.keys(data).find(k => data[k].createdAt === entryRaw.createdAt && data[k].phoneDigits === entryRaw.phoneDigits);
        if (key) {
          const currentStatus = data[key].disqualifiedRounds && data[key].disqualifiedRounds[entryRaw.roundTitle];
          firebaseSet(firebaseRef(db, `entries/${key}/disqualifiedRounds/${entryRaw.roundTitle}`), !currentStatus).then(() => {
            alert(`Status de qualificação alterado para a rodada ${entryRaw.roundTitle}.`);
          });
        }
      }
    });
  };

  const handleManualPoints = () => {
    if (!modTargetPhone) return;
    const entriesRef = firebaseRef(db, "entries");
    entriesRef.once("value").then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.keys(data).forEach(k => {
          if (data[k].phoneDigits === modTargetPhone.replace(/\D/g, "")) {
            firebaseSet(firebaseRef(db, `entries/${k}/bonusPoints`), parseInt(modPoints) || 0);
          }
        });
        alert("Ajuste manual de pontuação concluído.");
        setModTargetPhone(""); setModPoints("0");
      }
    });
  };

  const toggleHallBlacklist = (phoneDigits) => {
    const current = blacklistHall && blacklistHall[phoneDigits];
    firebaseSet(firebaseRef(db, `blacklistHall/${phoneDigits}`), !current).then(() => {
      alert("Configuração de exibição do participante updated.");
    });
  };

  const handleCreateRound = () => {
    if (!newRoundTitle || !roundDeadline || !g1Home || !g1Away || !g2Home || !g2Away || !g3Home || !g3Away) { alert("Preencha todos os campos da nova rodada."); return; }
    const newRoundStructure = {
      title: newRoundTitle, deadline: roundDeadline,
      games: [
        { id: 1, home: { name: g1Home, code: getFlagCode(g1Home) }, away: { name: g1Away, code: getFlagCode(g1Away) }, date: "Confronto 1" },
        { id: 2, home: { name: g2Home, code: getFlagCode(g2Home) }, away: { name: g2Away, code: getFlagCode(g2Away) }, date: "Confronto 2" },
        { id: 3, home: { name: g3Home, code: getFlagCode(g3Home) }, away: { name: g3Away, code: getFlagCode(g3Away) }, date: "Confronto 3" }
      ]
    };
    firebaseSet(firebaseRef(db, "roundConfig"), newRoundStructure).then(() => alert("Nova rodada disponibilizada globalmente."));
  };

  const clearAllData = () => {
    if (confirmPass !== ADMIN_PASSWORD) { alert("Senha de segurança incorreta."); return; }
    if (!confirm("Tem certeza que deseja apagar permanentemente todos os dados do banco?")) return;
    firebaseSet(firebaseRef(db, "entries"), {});
    firebaseSet(firebaseRef(db, "resultsHistory"), {});
    firebaseSet(firebaseRef(db, "blacklistHall"), {});
    firebaseSet(firebaseRef(db, "roundConfig"), DEFAULT_ROUND);
    alert("Operação de limpeza geral executada.");
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Painel Operacional</h2>
        <button className="logout-btn" onClick={onLogout}>Sair</button>
      </div>
      
      <div className="admin-card-section bg-darken">
        <h3>Definir Placar Oficial Real: {round.title}</h3>
        {round.games.map((g) => (
          <div key={g.id} className="result-row">
            <span className="result-label-align"><img src={`https://flagcdn.com/w40/${g.home.code}.png`} className="admin-flag" alt="" /> {g.home.name} x {g.away.name} <img src={`https://flagcdn.com/w40/${g.away.code}.png`} className="admin-flag" alt="" /></span>
            <div className="result-inputs">
              <input className="result-input" value={currentResults[g.id]?.home || ""} onChange={(e) => setCurrentResults(p => ({...p, [g.id]: {...p[g.id], home: e.target.value}}))} placeholder="0" />
              <span>×</span>
              <input className="result-input" value={currentResults[g.id]?.away || ""} onChange={(e) => setCurrentResults(p => ({...p, [g.id]: {...p[g.id], away: e.target.value}}))} placeholder="0" />
            </div>
          </div>
        ))}
        <button className="calc-btn" onClick={saveResults}>Salvar e Computar Resultados</button>
      </div>

      <div className="admin-card-section">
        <h3>Alteração de Pontuação Manual</h3>
        <input className="field-input" placeholder="WhatsApp do(a) Competidor(a)" value={modTargetPhone} onChange={e=>setModTargetPhone(e.target.value)} style={{marginBottom:10}} />
        <input className="field-input" placeholder="Pontos Totais Fixos" value={modPoints} onChange={e=>setModPoints(e.target.value)} style={{marginBottom:10}} />
        <button className="calc-btn" onClick={handleManualPoints}>Sobreescrever Pontuação</button>
      </div>

      <div className="admin-card-section">
        <h3>Lançar Próxima Rodada</h3>
        <input className="field-input" placeholder="Ex: Rodada 2" value={newRoundTitle} onChange={(e) => setNewRoundTitle(e.target.value)} style={{marginBottom:10}} />
        <div className="deadline-config-box">
          <label className="deadline-label">Data e Hora Limite:</label>
          <input type="datetime-local" className="field-input deadline-picker" value={roundDeadline} onChange={(e) => setRoundDeadline(e.target.value)} style={{marginTop:4, marginBottom:10}} />
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="admin-game-builder">
            <h4 style={{fontSize:11, textTransform:'uppercase', color:'#aaa', margin:'6px 0'}}>Jogo {i}</h4>
            <div className="builder-row">
              <input placeholder="Mandante" value={i===1?g1Home:i===2?g2Home:g3Home} onChange={e => i===1?setG1Home(e.target.value):i===2?setG2Home(e.target.value):setG3Home(e.target.value)} />
              <span>x</span>
              <input placeholder="Visitante" value={i===1?g1Away:i===2?g2Away:g3Away} onChange={e => i===1?setG1Away(e.target.value):i===2?setG2Away(e.target.value):setG3Away(e.target.value)} />
            </div>
          </div>
        ))}
        <button className="publish-round-btn" onClick={handleCreateRound} style={{marginTop:12}}>Publicar Rodada Oficial</button>
      </div>

      <div className="admin-card-section">
        <h3>Lista de Participantes ({entries.length})</h3>
        <div className="admin-scroll-list">
          {entries.map((e, idx) => (
            <div key={idx} className="admin-list-item">
              <div style={{fontWeight:'bold', color:'#FFD700'}}>{formatName(e.name)}</div>
              <div style={{fontSize:11, color:'#aaa'}}>{e.phone}</div>
              <div style={{color:'#eee', margin:'4px 0'}}>J1:[{e.scores[1]?.home}x{e.scores[1]?.away}] | J2:[{e.scores[2]?.home}x{e.scores[2]?.away}] | J3:[{e.scores[3]?.home}x{e.scores[3]?.away}]</div>
              <div style={{display:'flex', gap:6, marginTop:8}}>
                <button onClick={() => toggleDisqualifyRound(e)} style={{background: e.disqualifiedRounds && e.disqualifiedRounds[e.roundTitle] ? '#10b981' : '#ef4444', color:'#fff', border:'none', borderRadius:4, padding:'6px 10px', cursor:'pointer', fontWeight:'bold', fontSize:11, flex:1}}>
                  {e.disqualifiedRounds && e.disqualifiedRounds[e.roundTitle] ? "Reabilitar" : "Desclassificar"}
                </button>
                <button onClick={() => toggleHallBlacklist(e.phoneDigits)} style={{background:'#1e293b', color:'#fff', border:'none', borderRadius:4, padding:'6px 10px', cursor:'pointer', fontSize:11, flex:1}}>
                  {blacklistHall && blacklistHall[e.phoneDigits] ? "Exibir" : "Ocultar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card-section" style={{border: "1px solid #ef4444"}}>
        <h3>Redefinição Total de Fábrica</h3>
        <input className="field-input" type="password" placeholder="Código Master" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} style={{marginBottom:10, textAlign:'center'}} />
        <button className="clear-btn" onClick={clearAllData}>Zerar Banco de Dados</button>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home"); 
  const [adminPass, setAdminPass] = useState("");
  const [passError, setPassError] = useState("");
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  
  const [round, setRound] = useState(DEFAULT_ROUND);
  const [entries, setEntries] = useState([]);
  const [resultsHistory, setResultsHistory] = useState({});
  const [blacklistHall, setBlacklistHall] = useState({});
  const [perfectWinners, setPerfectWinners] = useState([]);
  const [partialWinners, setPartialWinners] = useState([]);

  useEffect(() => {
    const loadFirebase = async () => {
      try {
        const scriptApp = document.createElement("script");
        scriptApp.src = "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js";
        document.head.appendChild(scriptApp);
        scriptApp.onload = () => {
          const scriptDb = document.createElement("script");
          scriptDb.src = "https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js";
          document.head.appendChild(scriptDb);
          scriptDb.onload = () => {
            const firebase = window.firebase;
            firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            firebaseRef = (database, path) => database.ref(path);
            firebaseSet = (reference, data) => reference.set(data);
            firebasePush = (reference) => reference.push();
            firebaseOnValue = (reference, callback) => reference.on("value", callback);
            firebaseOff = (reference) => reference.off();
            setFirebaseReady(true);
          };
        };
      } catch (err) { console.error(err); }
    };
    loadFirebase();
  }, []);

  useEffect(() => {
    if (!firebaseReady || !db) return;
    firebaseOnValue(firebaseRef(db, "roundConfig"), snapshot => { const d = snapshot.val(); if(d) setRound(d); });
    firebaseOnValue(firebaseRef(db, "entries"), snapshot => { const d = snapshot.val(); setEntries(d ? Object.values(d) : []); });
    firebaseOnValue(firebaseRef(db, "resultsHistory"), snapshot => { const d = snapshot.val(); setResultsHistory(d ? d : {}); });
    firebaseOnValue(firebaseRef(db, "blacklistHall"), snapshot => { const d = snapshot.val(); setBlacklistHall(d ? d : {}); });
  }, [firebaseReady]);

  useEffect(() => {
    const activeResults = resultsHistory[round.title];
    if (activeResults) {
      const currentRoundEntries = entries.filter(e => e.roundTitle === round.title);
      
      const perfects = currentRoundEntries.filter(entry => {
        if (blacklistHall && blacklistHall[entry.phoneDigits]) return false;
        if (entry.disqualifiedRounds && entry.disqualifiedRounds[round.title]) return false;
        let allMatch = true;
        [1, 2, 3].forEach(id => {
          const r = activeResults[id]; const p = entry.scores[id];
          if (!r || r.home==="" || r.away==="" || parseInt(r.home)!==p.home || parseInt(r.away)!==p.away) allMatch = false;
        });
        return allMatch;
      });

      const partials = currentRoundEntries.filter(entry => {
        if (entry.disqualifiedRounds && entry.disqualifiedRounds[round.title]) return false;
        let hasOne = false;
        let isPerfect = perfects.some(p => p.phoneDigits === entry.phoneDigits);
        if (isPerfect) return false;
        [1, 2, 3].forEach(id => {
          const r = activeResults[id]; const p = entry.scores[id];
          if (r && r.home!=="" && r.away!=="" && parseInt(r.home)===p.home && parseInt(r.away)===p.away) hasOne = true;
        });
        return hasOne;
      });

      setPerfectWinners(perfects);
      setPartialWinners(partials);
    } else {
      setPerfectWinners([]); setPartialWinners([]);
    }
  }, [round, resultsHistory, entries, blacklistHall]);

  const handleAdminLogin = () => {
    if (adminPass === ADMIN_PASSWORD) { setView("admin"); setPassError(""); setAdminPass(""); }
    else { setPassError("Código de acesso incorreto."); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Oswald:wght@500;600;700&display=swap');
        
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { 
          font-family: 'Inter', sans-serif; 
          background: #004D2C; 
          color: #f1f5f9; 
          min-height: 100vh; 
          display: block;  
          letter-spacing: -0.01em;
        }

        .app { 
          width: 100%; 
          max-width: 600px;
          margin: 0 auto; 
          min-height: 100vh; 
          background: #004D2C; 
          padding-bottom: 40px; 
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); 
          position: relative; 
          border-left: 1px solid rgba(255,255,255,0.05);
          border-right: 1px solid rgba(255,255,255,0.05);
        }
        
        .header { 
          background: linear-gradient(180deg, #005933 0%, #004D2C 100%);
          border-bottom: 1px solid rgba(255,255,255,0.08); 
          padding: 32px 24px 24px; 
          text-align: center; 
          position: relative; 
          border-bottom: 3px solid #FFD700; 
        }
        
        .header-clinic { 
          font-size: 11px; 
          letter-spacing: 0.2em; 
          color: #FFD700; 
          text-transform: uppercase; 
          font-weight: 600; 
          margin-bottom: 6px; 
        }
        
        .header-title { 
          font-family: 'Oswald', sans-serif; 
          font-size: 36px; 
          text-transform: uppercase; 
          line-height: 1.1; 
          color: #ffffff; 
          letter-spacing: 0.02em;
        }
        
        .header-title span { color: #FFD700; }
        .header-sub { font-size: 13px; color: #84a396; font-weight: 400; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 6px; }

        .prizes-badge-container { display: flex; flex-direction: column; gap: 6px; align-items: center; margin-top: 16px; }
        .header-prize { background: rgba(245,197,24,0.1); color: #FFD700; border: 1px solid rgba(245,197,24,0.25); font-weight: 600; font-size: 11px; border-radius: 4px; padding: 6px 14px; text-transform: uppercase; letter-spacing: 0.05em; }
        .header-prize.ranking-badge { background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.25); }

        .admin-link { position: absolute; top: 20px; right: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: rgba(255, 255, 255, 0.05); transition: background 0.2s; }
        .admin-link:hover { background: rgba(255, 255, 255, 0.15); }
        .admin-link:hover .gear-icon { transform: rotate(45deg); }
        
        .gear-icon { position: relative; width: 14px; height: 14px; background: #FFD700; border-radius: 50%; transition: transform 0.3s ease; }
        .gear-icon::before { content: ""; position: absolute; top: 3px; left: 3px; width: 8px; height: 8px; background: #005933; border-radius: 50%; z-index: 2; }
        .gear-icon::after { content: ""; position: absolute; top: -3px; left: 5px; width: 4px; height: 20px; background: #FFD700; box-shadow: 0 0 0 0 #FFD700, 6px 6px 0 0 #FFD700, -6px 6px 0 0 #FFD700; transform: rotate(0deg); border-radius: 1px; }
        .gear-extra-teeth { position: absolute; top: 5px; left: -3px; width: 20px; height: 4px; background: #FFD700; border-radius: 1px; }
        .gear-extra-teeth::after { content: ""; position: absolute; top: -5px; left: 5px; width: 10px; height: 14px; background: transparent; border-left: 4px solid #FFD700; border-right: 4px solid #FFD700; transform: rotate(45deg); }
        
        .container { padding: 20px 16px; width: 100%; box-sizing: border-box; }
        
        .live-results-board { 
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255,255,255,0.08); 
          border-radius: 8px; 
          padding: 16px; 
          margin-bottom: 24px; 
        }
        
        .live-title { font-family: 'Oswald', sans-serif; font-size: 14px; color: #FFD700; text-align: center; margin-bottom: 12px; letter-spacing: 0.05em; text-transform: uppercase; }
        .real-row-display { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; align-items: center; }
        .real-row-display:last-of-type { border-bottom: none; }

        @keyframes goldPulse {
          0% { box-shadow: 0 0 4px #FFD700, inset 0 0 10px rgba(255,215,0,0.2); }
          50% { box-shadow: 0 0 16px #FFD700, inset 0 0 20px rgba(255,215,0,0.4); }
          100% { box-shadow: 0 0 4px #FFD700, inset 0 0 10px rgba(255,215,0,0.2); }
        }
        .veredicto-box { margin-top: 14px; padding: 12px; border-radius: 8px; background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); text-align: center; }
        .veredicto-box.tem-ganhador {
          background: linear-gradient(135deg, #004D2C 0%, #002716 100%);
          border: 2px solid #FFD700;
          animation: goldPulse 2.5s infinite ease-in-out;
          padding: 24px 16px;
        }
        .winner-highlight-title { font-family: 'Oswald', sans-serif; font-size: 18px; text-transform: uppercase; letter-spacing: 0.06em; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.4); }
        .winner-name-badge { display: inline-block; background: #FFD700; color: #004D2C; font-weight: 800; font-size: 16px; padding: 6px 18px; border-radius: 4px; margin: 12px 0; text-transform: uppercase; font-family: 'Oswald', sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.3); letter-spacing: 0.02em; }
        .winner-prize-destination { font-size: 13px; color: #ffffff; font-weight: 600; letter-spacing: 0.02em; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border-left: 3px solid #10b981; max-width: 90%; margin: 0 auto; }
        
        .partial-winners-box {
          margin-top: 16px;
          padding: 14px 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
          text-align: center;
        }
        .partial-title {
          color: #94a3b8;
          font-size: 11px;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }
        .partial-names {
          font-size: 13px;
          color: #ffffff;
          font-weight: 500;
          line-height: 1.4;
          max-width: 95%;
          margin: 0 auto;
          text-align: center;
        }

        .nav-tabs { display: flex; background: rgba(0, 0, 0, 0.2); margin-bottom: 24px; border-radius: 6px; padding: 4px; }
        .tab-btn { flex: 1; background: transparent; border: none; color: #94a3b8; padding: 10px 4px; font-weight: 600; cursor: pointer; font-size: 12px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.02em; font-family: inherit; transition: all 0.2s; }
        .tab-btn.active { background: #004D2C; color: #FFD700; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
        
        .active-round-title { font-family: 'Oswald', sans-serif; font-size: 20px; color: #ffffff; text-align: center; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
        .countdown-box { display: flex; flex-direction: column; gap: 4px; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 14px; text-align: center; margin-bottom: 20px; }
        .urgent-pulsing { border: 1px solid rgba(239,68,68,0.4) !important; background: rgba(239,68,68,0.05) !important; }
        .urgent-pulsing .timer-clock { color: #f87171 !important; }
        .timer-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; font-weight: 500; }
        .timer-clock { font-family: 'Oswald', sans-serif; font-size: 22px; color: #FFD700; letter-spacing: 0.02em; }
        
        .form-fields { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .field-input { background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: #fff; padding: 12px 14px; outline: none; width: 100%; font-family: inherit; font-size: 13px; transition: border-color 0.2s, background 0.2s; }
        .field-input:focus { border-color: #f5c518; background: #243146; }
        
        .games-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
        .game-card { background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .game-date { font-size: 11px; color: #10b981; text-align: center; margin-bottom: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
        .matchup { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 8px; }
        .team { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 75px; }
        .flag-img { width: 38px; height: 25px; object-fit: cover; border-radius: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .team-name { font-size: 10px; font-weight: 700; letter-spacing: 0.02em; text-align: center; color: #e2e8f0; word-break: break-word; }
        .vs-center { display: flex; justify-content: center; align-items: center; padding: 0 4px; }
        .score-controls { display: flex; align-items: center; justify-content: center; gap: 4px; }
        .score-input-wrap { display: flex; align-items: center; justify-content: center; gap: 4px; }
        .score-btn { width: 26px; height: 26px; border-radius: 4px; border: none; background: #FFD700; color: #004D2C; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .score-number { font-family: 'Oswald', sans-serif; font-size: 24px; min-width: 22px; text-align: center; color: #ffffff; line-height: 1; }
        .score-sep { font-size: 12px; color: #64748b; font-weight: 700; padding: 0 2px; }
        
        .popup-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(9,13,22,0.85); display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 20px; backdrop-filter: blur(4px); }
        .popup-content { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; max-width: 420px; width: 100%; padding: 24px; max-height: 80vh; overflow-y: auto; }
        .popup-title { font-family: 'Oswald', sans-serif; font-size: 20px; color: #ffffff; text-align: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; text-transform: uppercase; }
        .popup-body { font-size: 13px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
        
        .popup-body p, .popup-body li { margin-bottom: 12px; }
        .popup-body ul { padding-left: 16px; margin-bottom: 12px; }
        .popup-body p:last-child { margin-bottom: 0; }

        .popup-close-btn { width: 100%; background: #FFD700; color: #004D2C; border: none; padding: 12px; border-radius: 4px; font-weight: 700; font-size: 13px; cursor: pointer; text-transform: uppercase; }
        
        .ranking-container { background: rgba(0, 0, 0, 0.2); border-radius: 8px; padding: 16px; border: 1px solid rgba(255,255,255,0.02); }
        .section-title { font-family: 'Oswald', sans-serif; font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; color: #fff; }
        .ranking-desc { font-size: 12px; color: #94a3b8; margin-bottom: 16px; }
        .ranking-table { display: flex; flex-direction: column; gap: 8px; }
        .ranking-row { display: flex; align-items: center; background: rgba(0, 0, 0, 0.2); padding: 12px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); }
        .ranking-row.podium-1 { border-left: 3px solid #FFD700; background: linear-gradient(90deg, rgba(255,215,0,0.04) 0%, rgba(0, 0, 0, 0.2) 100%); }
        .ranking-position { font-size: 13px; font-weight: 700; width: 30px; color: #94a3b8; }
        .ranking-row.podium-1 .ranking-position { color: #FFD700; }
        .ranking-user-info { flex: 1; display: flex; flex-direction: column; padding-left: 4px; }
        .user-name { font-weight: 600; font-size: 13.5px; color: #f8fafc; }
        .user-phone-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
        .ranking-score-total { font-size: 13px; color: #FFD700; text-align: right; }
        .premium-badge-hall { font-size: 11px; background: rgba(245,197,24,0.1); color: #FFD700; padding: 4px 8px; border-radius: 4px; font-weight: 600; border: 1px solid rgba(245,197,24,0.2); }
        .highlight-premium { border: 1px solid rgba(245,197,24,0.15); }
        
        .submit-btn { width: 100%; background: #FFD700; color: #004D2C; font-size: 14px; font-weight: 700; border: none; border-radius: 6px; padding: 14px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; }
        .submit-btn:disabled { background: #334155; color: #64748b; cursor: not-allowed; }
        
        .success-screen { text-align: center; padding: 10px 0; }
        .success-icon-wrap { width: 48px; height: 48px; border-radius: 50%; background: rgba(16,185,129,0.1); color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 20px; border: 1px solid rgba(16,185,129,0.2); }
        .success-welcome { font-size: 14px; color: #94a3b8; margin-top: 4px; }
        .prize-info { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 14px; margin: 20px 0; font-size: 13px; text-align: left; line-height: 1.6; color: #cbd5e1; }
        .summary-box { background: rgba(0, 0, 0, 0.2); border-radius: 8px; padding: 16px; text-align: left; }
        .summary-box h3 { font-family: 'Oswald', sans-serif; font-size: 14px; color: #ffffff; margin-bottom: 14px; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }
        .summary-card { background: rgba(0, 0, 0, 0.2); border-radius: 8px; padding: 12px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.02); }
        .summary-match-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; justify-content: center; }
        .summary-team-side { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: bold; width: 100%; }
        .summary-left { justify-content: flex-start; text-align: left; }
        .summary-right { justify-content: flex-end; text-align: right; }
        .summary-flag { width: 24px; height: 16px; object-fit: cover; border-radius: 2px; }
        .summary-score-display { font-family: 'Oswald', sans-serif; font-size: 20px; background: rgba(245,197,24,0.15); color: #FFD700; padding: 2px 10px; border-radius: 4px; text-align: center; min-width: 50px; }
        
        .admin-panel { 
          display: flex; 
          flex-direction: column; 
          gap: 20px; 
          width: 100%; 
          box-sizing: border-box;
          padding: 0 4px; 
        }
        .admin-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          border-bottom: 1px solid rgba(255,255,255,0.08); 
          padding-bottom: 14px;
          width: 100%;
          box-sizing: border-box;
          gap: 10px;
        }
        .admin-header h2 { 
          font-family: 'Oswald', sans-serif; 
          font-size: 20px; 
          text-transform: uppercase; 
          color: #FFD700; 
          white-space: nowrap; 
        }
        
        .admin-card-section { 
          background: rgba(0, 0, 0, 0.2); 
          border-radius: 8px; 
          padding: 16px 12px; 
          width: 100%;
          box-sizing: border-box; 
          display: flex;
          flex-direction: column;
        }
        .admin-card-section h3 { font-family: 'Oswald', sans-serif; font-size: 14px; margin-bottom: 14px; color: #fff; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; }
        
        .result-row { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 10px; 
          background: rgba(0, 0, 0, 0.2); 
          padding: 10px; 
          border-radius: 6px;
          width: 100%;
          box-sizing: border-box;
          gap: 8px;
        }
        .result-label-align { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; flex: 1; color: #ffffff; min-width: 0; word-break: break-word; }
        .admin-flag { width: 20px; height: 13px; object-fit: cover; flex-shrink: 0; }
        .result-inputs { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .result-input { width: 34px; height: 34px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255,255,255,0.12); color: #FFD700; text-align: center; border-radius: 4px; font-weight: 700; font-family: 'Oswald', sans-serif; font-size: 15px; outline: none; }
        
        .admin-game-builder { 
          background: rgba(0,0,0,0.15); 
          padding: 12px; 
          border-radius: 6px; 
          margin-bottom: 10px; 
          width: 100%;
          box-sizing: border-box;
        }
        .builder-row { display: flex; gap: 8px; align-items: center; width: 100%; box-sizing: border-box; }
        .builder-row input { flex: 1; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255,255,255,0.08); padding: 10px; color: #FFD700; border-radius: 6px; text-align: center; font-family: inherit; font-size: 13px; outline: none; min-width: 0; box-sizing: border-box; }
        .builder-row span { color: #64748b; font-weight: bold; }

        .admin-scroll-list { 
          max-height: 320px; 
          overflow-y: auto; 
          background: rgba(0,0,0,0.25); 
          padding: 10px; 
          border-radius: 8px; 
          display: flex; 
          flex-direction: column; 
          gap: 8px;
          width: 100%;
          box-sizing: border-box;
        }
        .admin-list-item { 
          font-size: 12px; 
          padding: 12px; 
          background: rgba(255,255,255,0.01); 
          border-radius: 6px; 
          border: 1px solid rgba(255,255,255,0.04);
          width: 100%;
          box-sizing: border-box;
        }

        .deadline-config-box { width: 100%; display: flex; flex-direction: column; }
        .deadline-picker { appearance: none; -webkit-appearance: none; color-scheme: dark; }

        .calc-btn { width: 100%; background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 12px; font-weight: 600; font-size: 12px; border-radius: 6px; cursor: pointer; text-transform: uppercase; margin-top: 6px; font-family: inherit; }
        .publish-round-btn { width: 100%; background: #10b981; color: #fff; font-weight: 700; padding: 13px; border-radius: 6px; border: none; cursor: pointer; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        .clear-btn { width: 100%; background: #ef4444; color: #fff; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: 700; border: none; font-size: 12px; text-transform: uppercase; }
        .logout-btn { background: #FFD700; border: none; color: #004D2C; padding: 6px 14px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 11px; text-transform: uppercase; }
        
        .admin-login { background: rgba(0, 0, 0, 0.2); border-radius: 8px; padding: 24px; text-align: center; width: 100%; box-sizing: border-box; }
        .error-msg { color: #f87171; font-size: 12px; margin-top: 8px; font-weight: 500; text-align: center; }
        .lockout-box { background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.15); color: #f87171; padding: 14px; border-radius: 8px; text-align: center; font-size: 13px; font-weight: 500; }
        .no-data { font-size: 12px; color: #94a3b8; text-align: center; padding: 16px 0; }
        .deadline-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600; text-align: left; }
      `}</style>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-title">Estética Priscila Xavier<br/>Regulamento Geral do Desafio</div>
            <div className="popup-body">
              <p>Boas-vindas ao Desafio da Copa Estética Priscila Xavier referente à Copa do Mundo 2026. Este sistema foi desenvolvido para premiar participantes e clientes assíduos através de palpites esportivos.</p>
              <p><strong>Formas de Premiações Ativas:</strong></p>
              <ul>
                <li><strong>Premiação por Rodada:</strong> Quem obtiver o acerto exato dos 3 placares da rodada ativa receberá uma Limpeza de Pele de Porcelana de forma integral e gratuita.</li>
                <li><strong>Classificação Geral / Ranking:</strong> Cada placar cravado integralmente acumula 1 ponto na tabela geral. O perfil com maior pontuação ao término do campeonato receberá o Grande Prêmio Especial.</li>
              </ul>
              <p><strong>Critérios de Validação e Desclassificação:</strong></p>
              <p>Para a validação e homologação do palpite, é obrigatório o preenchimento do Nome Completo e de um número de WhatsApp real e ativo. Cadastros com informações inconsistentes, incompletas ou duplicadas não serão admitidos. O descumprimento destas normas acarretará na desclassificação direta da rodada correspondente e na respectiva remoção de pontos adquiridos.</p>
            </div>
            <button className="popup-close-btn" onClick={() => setShowPopup(false)}>Aceitar e Fechar</button>
          </div>
        </div>
      )}

      <div className="app">
        <div className="header">
          <div className="header-clinic">Clínica Estética Priscila Xavier</div>
          <div className="header-title">Desafio <span>da</span> Copa</div>
          <div className="header-sub">Copa do Mundo 2026</div>
          <div className="prizes-badge-container">
            <div className="header-prize">Prêmio da Rodada: {PRIZE_ROUND}</div>
            <div className="header-prize ranking-badge">Prêmio Final: {PRIZE_RANKING}</div>
          </div>
          
          <div className="admin-link" onClick={() => setView(view === "admin" || view === "admin-login" ? "home" : "admin-login")} title="Painel Admin">
            <div className="gear-icon">
              <div className="gear-extra-teeth"></div>
            </div>
          </div>
        </div>

        <div className="container">
          {view === "home" && resultsHistory[round.title] && (
            <div className="live-results-board">
              <div className="live-title">Resultados Consolidados: {round.title.toUpperCase()}</div>
              {round.games.map(g => {
                const res = resultsHistory[round.title][g.id];
                return (
                  <div key={g.id} className="real-row-display">
                    <span>{g.home.name} x {g.away.name}</span>
                    <span style={{color:'#FFD700', fontWeight:'700'}}>{res ? `${res.home} × ${res.away}` : "Pendente"}</span>
                  </div>
                );
              })}
              
              <div className={`veredicto-box ${perfectWinners.length > 0 ? "tem-ganhador" : ""}`}>
                {perfectWinners.length > 0 ? (
                  <div>
                    <h4 className="winner-highlight-title">Temos Ganhador(a) na Rodada!</h4>
                    {perfectWinners.map((w,i) => (
                      <div key={i} className="winner-name-badge">
                        {formatName(w.name)}
                      </div>
                    ))}
                    <div className="winner-prize-destination">
                      Prêmio Conquistado: <strong>{PRIZE_ROUND}</strong>
                    </div>
                  </div>
                ) : (
                  <p style={{fontSize: 13, color: '#FFD700', fontWeight: '600', padding: '6px 0', textAlign: 'center', width: '100%', display: 'block'}}>Não houve acertos totais dos 3 placares nesta rodada.</p>
                )}
                
                {partialWinners.length > 0 && (
                  <div className="partial-winners-box">
                    <h5 className="partial-title">Pontuaram e subiram no Ranking:</h5>
                    <p className="partial-names">{partialWinners.map(w => formatName(w.name)).join(", ")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(view === "home" || view === "ranking" || view === "hall") && (
            <div className="nav-tabs">
              <button className={`tab-btn ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>Palpites</button>
              <button className={`tab-btn ${view === "ranking" ? "active" : ""}`} onClick={() => setView("ranking")}>Classificação</button>
              <button className={`tab-btn ${view === "hall" ? "active" : ""}`} onClick={() => setView("hall")}>Destaques</button>
            </div>
          )}

          {view === "home" && (
            <>
              <h2 className="active-round-title">{round.title}</h2>
              <ParticipantForm round={round} entries={entries} ready={firebaseReady} />
              <div style={{marginTop:24}}><RankingTab entries={entries} resultsHistory={resultsHistory} /></div>
            </>
          )}

          {view === "ranking" && <RankingTab entries={entries} resultsHistory={resultsHistory} />}
          {view === "hall" && <HallFamaTab entries={entries} resultsHistory={resultsHistory} blacklistHall={blacklistHall} />}

          {view === "admin-login" && (
            <div className="admin-login">
              <h2 style={{fontFamily:'Oswald', fontSize:16, textTransform:'uppercase', color:'#FFD700'}}>Acesso Restrito</h2>
              <input className="field-input" type="password" placeholder="Código de Acesso Operacional" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()} style={{textAlign:'center', marginTop:14, marginBottom:4}} />
              {passError && <div className="error-msg">{passError}</div>}
              <button className="submit-btn" onClick={handleAdminLogin} style={{marginTop:12}}>Autenticar</button>
            </div>
          )}

          {view === "admin" && <AdminPanel round={round} entries={entries} resultsHistory={resultsHistory} blacklistHall={blacklistHall} onLogout={() => setView("home")} />}
        </div>
      </div>
    </>
  );
}