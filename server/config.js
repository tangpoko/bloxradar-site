// Every threshold the panels use, in one place. All values are placeholders to tune later.
export const PANELS = {
  breakouts: {
    windowDays: 7, // usual level = average of hourly averages over this many days...
    excludeRecentHours: 2, // ...leaving out the most recent hours, so the spike itself does not count
    minPlayers: 500, // current players needed to be listed
    minBaseline: 50, // usual level needed to be listed
    minHours: 24, // hours of history needed, so brand new games are not compared against nothing
    minRatio: 1.5, // current players must be at least this many times the usual level
  },
  newHighs: {
    withinHours: 3, // all-time peak was set within this many hours
    minPlayers: 300, // peak needed to be listed
    nearPeak: 0.9, // current players must still be at least this share of the peak
    minTrackedHours: 24, // games we only just started tracking always look like they are at a peak
  },
  newGames: { days: 30 },
  trends: {
    sampleGames: 1000, // the most played games whose names are split into words
    minGames: 2, // a word has to appear in at least this many game names
    examples: 3,
    growingMinPlayers: 2000, // "Growing fastest" only counts words with this many players yesterday
    newMinGames: 2, // "In new games" needs a word in at least this many new games
  },
  creatorsGrowing: {
    sample: 200, // the biggest studios and the biggest solo developers, this many of each
    minPrevPlayers: 1000, // players yesterday needed, so tiny creators do not swing to +500%
  },
  topEarningSort: 'top-earning',
  rated: {
    minPlayers: 50, // players now needed to be listed
    minVotes: 500, // likes plus dislikes needed, on top of the formula's own pull towards 50%
  },
  saving: { days: 1, weekDays: 7 }, // favorites gained against the daily reading this many days old
  rising: {
    minPlayers: 100, // players now, lower end of "small"
    maxPlayers: 2000, // players now, upper end
    windowDays: 3, // compare the last 24 hours with the same 24 hours this many days earlier
    minHours: 12, // hourly readings needed in each of the two days
    minThen: 20, // average players needed back then, so 2 to 40 does not top the list
    minRatio: 1.3, // must be at least this many times the earlier average
  },
  recordsToday: {
    minPlayers: 300, // peak needed to be listed
    minTrackedDays: 3, // games we only just started reading always look like they set a record
  },
};

// Price benchmarks (server/prices.js): a type of game pass needs passes from this many games in a
// genre before the genre gets its own figure. Below that the figure for all genres is used.
export const PRICES = { minGames: 5 };

// Earnings estimate on game pages (server/earnings.js). Roblox publishes no game's earnings,
// so every number here is a placeholder to tune later.
export const EARNINGS = {
  // Robux a developer earns per hour played, for a game that sells a typical number of items at
  // typical prices. Starting point: creators cashed out $1,503M through DevEx in 2025 (annual
  // report) over roughly 124B hours played, which is about 3.3 Robux per hour across the whole
  // platform. That figure includes avatar item creators, so a game gets a little less.
  baseRobuxPerHour: 2.5,
  // Games with nothing for sale still earn Creator Rewards for engagement. Share of the base rate.
  noSalesFactor: 0.15,
  // How strongly item count and price move the rate. 0.35 means 10 times the typical item count
  // gives about 2.2 times the rate, not 10 times.
  itemsWeight: 0.35,
  priceWeight: 0.35,
  minFactor: 0.3,
  maxFactor: 3,
  // The middle figure is shown with this range around it.
  rangeLow: 0.5,
  rangeHigh: 2,
  // Typical item count and price come from every game whose catalogue we have read. Until enough
  // games have been read, these stand in.
  minReferenceGames: 20,
  fallbackItems: 15,
  fallbackPrice: 100,
  devexUsdPerRobux: 0.0038, // DevEx rate since September 2025
  averageDays: 30, // the monthly figure uses the average day over at most this many full days
  minHoursForFullDay: 20, // hourly averages needed for a day to count as complete
};

// Filters on the game lists: the player count steps offered, and the label for games with no genre.
export const FILTERS = {
  minPlayers: [1000, 10000, 100000],
  noGenre: 'Other',
  maxGenres: 20,
};

export const CACHE_SECONDS = 60;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 200;

// Marketplace. Placeholders. overallDepth is how many items each overall list holds (10 pages of
// 30 in src/catalog.js); items only in a subcategory list rank after all of them.
export const MARKET = {
  snapshotSeconds: 300,
  pageSize: 30,
  maxLimit: 100,
  overallDepth: 300,
};
