import fs from 'node:fs/promises';

const writeJSON = async (fileName, data) => {
  const json = JSON.stringify(data, null, '\t');
  await fs.writeFile(fileName, `${json}\n`);
};

const readPlayers = async (fileName) => {
  const json = await fs.readFile(fileName, 'utf8');
  const data = JSON.parse(json);
  return data.playerslist.player;
};

const playersByID = new Map();

// Match the order on the FIDE site, i.e. first Standard, then Rapid, then Blitz.
// E.g. https://ratings.fide.com/profile/1503014

const players = await readPlayers('./raw/standard.json');
for (const player of players) {
  const standardRating = player.rating;
  delete player.rating;

  player.rating_standard = standardRating;
  player.rating_rapid = null;
  player.rating_blitz = null;

  const id = player.fideid;
  playersByID.set(id, player);
}

const playersRapid = await readPlayers('./raw/rapid.json');
for (const player of playersRapid) {
  const rapidRating = player.rating;
  delete player.rating;

  const id = player.fideid;
  if (playersByID.has(id)) {
    const entryToUpdate = playersByID.get(id);
    entryToUpdate.rating_rapid = rapidRating;
  } else {
    player.rating_standard = null;
    player.rating_rapid = rapidRating;
    player.rating_blitz = null;
    playersByID.set(id, player);
  }
}

const playersBlitz = await readPlayers('./raw/blitz.json');
for (const player of playersBlitz) {
  const blitzRating = player.rating;
  delete player.rating;

  const id = player.fideid;
  if (playersByID.has(id)) {
    const entryToUpdate = playersByID.get(id);
    entryToUpdate.rating_blitz = blitzRating;
  } else {
    player.rating_standard = null;
    player.rating_rapid = null;
    player.rating_blitz = blitzRating;
    playersByID.set(id, player);
  }
}

const countryMap = new Map();
for (const [id, player] of playersByID) {
  const country = player.country;
  if (countryMap.has(country)) {
    countryMap.get(country).push(player);
  } else {
    countryMap.set(country, [player]);
  }
}

// Export the combined player data, one file per country.
for (const [country, players] of countryMap) {
  players.sort((a, b) => {
    return b.rating_standard - a.rating_standard;
  });
  await writeJSON(`./dist/${country.toLowerCase()}.json`, players);
}
