// TeamSidebar receives everything it needs from PokemonGrid via props.
// It renders two separate cards so the layout isn't one giant scrollable block.
function TeamSidebar({
  // The array of Pokemon objects the user has added to their team.
  teamPokemons,
  // Pre-computed array of { id, name, weaknesses[] } for every team member.
  teamPokemonWeaknesses,
  // Pre-computed array of { name, count } sorted by how many teammates share each weakness.
  teamWeaknesses,
  // Upper limit for the team (always 6); used to render empty Pokeball slots.
  teamLimit,
  // Callback that removes a Pokemon from the team when the user clicks "Remove".
  onRemoveFromTeam,
  // Converts API names like "mr-mime" into "Mr Mime" for display.
  formatName,
}) {
  // The Pokeball image is shown in empty slots before the user adds a Pokemon.
  const pokeBallImage =
    "https://www.clipartmax.com/png/small/129-1298390_pokeball-transparent-png-pokeball-png-pokemon-go.png";

  return (
    // sidebar-stack stacks the two cards vertically with a gap.
    // On xl screens CSS makes the whole stack sticky so it scrolls with the page.
    <div className="sidebar-stack">
      {/* ── CARD 1: Your Team ─────────────────────────────────────────────── */}
      {/* Shows an image + name for each slot; empty slots show a Pokeball. */}
      <section className="card border-0 shadow-sm sidebar-card">
        <div className="card-body p-3 p-lg-4">
          {/* Title row */}
          <h2 className="h4 mb-1">Your Team</h2>

          {/* Subtitle: tells the user how many of the 6 slots they've filled. */}
          <p className="text-secondary small mb-3">
            {teamPokemons.length}/{teamLimit} slots filled
          </p>

          {/* team-slots is a CSS grid that stacks each slot row. */}
          <div className="team-slots mb-0">
            {/*
              Array.from({ length: teamLimit }) creates [undefined × 6]
              so we always render exactly 6 rows, even if the team is empty.
            */}
            {Array.from({ length: teamLimit }).map((_, index) => {
              // Look up whether this slot is occupied (undefined if not).
              const teamPokemon = teamPokemons[index];

              return (
                // Each row is a <article> with a Pokeball or Pokemon image on the left.
                <article
                  key={`team-slot-${index}`} // Unique key required by React when rendering lists.
                  className="team-slot"
                  aria-label={`Team slot ${index + 1}`} // Screen-reader label.
                >
                  {/* Image: shows the Pokemon sprite or the Pokeball placeholder. */}
                  <img
                    src={
                      teamPokemon
                        ? teamPokemon.sprites.front_default // Official front sprite from the API.
                        : pokeBallImage // Placeholder when the slot is empty.
                    }
                    alt={
                      teamPokemon
                        ? teamPokemon.name // Alt text for screen readers.
                        : "Empty Pokeball slot"
                    }
                    className="team-slot-image"
                  />

                  {/* Right side: name text and optional Remove button. */}
                  <div className="team-slot-copy">
                    {/* Show the formatted Pokemon name or "Empty Slot N". */}
                    <p className="mb-0 small fw-semibold">
                      {teamPokemon
                        ? formatName(teamPokemon.name)
                        : `Empty Slot ${index + 1}`}
                    </p>

                    {/*
                      Only render the Remove button when a Pokemon occupies this slot.
                      Clicking it calls onRemoveFromTeam with the Pokemon's ID,
                      which filters it out of the teamPokemons state in App.jsx.
                    */}
                    {teamPokemon ? (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 team-remove-btn"
                        onClick={() => onRemoveFromTeam(teamPokemon.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CARD 2: Weaknesses ────────────────────────────────────────────── */}
      {/*
        This card shows two sections:
          1. Per-Pokemon breakdown: each member's individual type weaknesses.
          2. Shared summary: which weaknesses are shared across the whole team.
        The card body has overflow + max-height so it scrolls internally
        instead of pushing the layout off-screen.
      */}
      <section className="card border-0 shadow-sm sidebar-card">
        <div className="card-body p-3 p-lg-4 sidebar-analysis-body">
          {/* ── Section 1: Per-Pokemon weakness list ── */}
          <p className="detail-label mb-2">Pokemon Weaknesses</p>

          {/*
            teamPokemonWeaknesses is populated by App.jsx as soon as a Pokemon
            is added; it's empty before the user adds anyone.
          */}
          {teamPokemonWeaknesses.length ? (
            // Outer grid that stacks one card per team member.
            <div className="team-weakness-breakdown mb-3">
              {teamPokemonWeaknesses.map((pokemon) => (
                // One bordered block per Pokemon so the names are clearly separated.
                <article key={pokemon.id} className="team-weakness-item">
                  {/* Pokemon name heading inside the weakness block. */}
                  <p className="small fw-semibold mb-2">
                    {formatName(pokemon.name)}
                  </p>

                  {/* Render colour-coded chips for each weakness, or a fallback message. */}
                  {pokemon.weaknesses.length ? (
                    // type-row is a flex-wrap container for the chips.
                    <div className="type-row">
                      {pokemon.weaknesses.map((name) => (
                        // Each chip uses a CSS class like "type-fire" for colour coding.
                        <span
                          key={`${pokemon.id}-${name}`} // Combine IDs to keep keys unique across Pokemon.
                          className={`weakness-chip type-${name}`}
                        >
                          {formatName(name)} {/* Turn "rock" into "Rock". */}
                        </span>
                      ))}
                    </div>
                  ) : (
                    // Some Pokemon (e.g. Normal/Electric) have no double-damage weaknesses.
                    <p className="small text-secondary mb-0">
                      No double-damage weaknesses.
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            // Nothing in the team yet — prompt the user to add someone.
            <p className="small text-secondary mb-3">
              Add Pokemon to see each member's weaknesses.
            </p>
          )}

          {/* ── Section 2: Shared weakness summary ── */}
          {/*
            teamWeaknesses comes from App.jsx and is already sorted by count (descending).
            The "x3" suffix tells the user how many teammates share that weakness.
          */}
          <p className="detail-label mb-2">Shared Weakness Summary</p>
          {teamWeaknesses.length ? (
            <div className="type-row">
              {teamWeaknesses.map((weakness) => (
                <span
                  key={weakness.name}
                  className={`weakness-chip type-${weakness.name}`}
                >
                  {/* e.g. "Fire x3" means 3 team members are weak to Fire. */}
                  {formatName(weakness.name)} x{weakness.count}
                </span>
              ))}
            </div>
          ) : (
            // No team members added yet.
            <p className="small text-secondary mb-0">
              Team summary will appear here.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

// Export so PokemonGrid.jsx can import and render it.
export default TeamSidebar;
