import { useEffect, useMemo, useState } from "react";
import "./App.css";
import DetailLoading from "./components/DetailLoading";
import ErrorState from "./components/ErrorState";
import PokemonDetail from "./components/PokemonDetail";
import PokemonGrid from "./components/PokemonGrid";

function App() {
  const teamLimit = 6;

  // Stores all Pokemon returned from the API.
  const [pokemons, setPokemons] = useState([]);
  // Stores the currently selected Pokemon for the detail page.
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  // Stores extra detail-only data (weaknesses + evolution cards).
  const [detailData, setDetailData] = useState(null);
  // Controls loading state for the grid layout.
  const [isGridLoading, setIsGridLoading] = useState(true);
  // Controls loading state for the detail layout.
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  // Shows API error messages in the UI.
  const [errorMessage, setErrorMessage] = useState("");
  // Stores Pokemon selected by the user for their team.
  const [teamPokemons, setTeamPokemons] = useState([]);
  // Stores weakness summary for the selected team.
  const [teamWeaknesses, setTeamWeaknesses] = useState([]);

  // Runs once on first render to fetch the Pokemon list + base details.
  useEffect(() => {
    // Fetches Pokemon list, then fetches each Pokemon full data.
    async function fetchPokemons() {
      try {
        // Request all Pokemon references (name + URL).
        const res = await fetch(
          "https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0",
        );

        // If HTTP status is not OK, stop and go to catch block.
        if (!res.ok) {
          throw new Error("Could not load Pokemon list.");
        }

        // Convert list response to JSON.
        const data = await res.json();
        // Fetch all Pokemon detail endpoints in parallel.
        const fullPokemonData = await Promise.all(
          data.results.map(async (p) => {
            // Request one Pokemon detail object.
            const pokemonRes = await fetch(p.url);

            // If one Pokemon fails, fail the full operation.
            if (!pokemonRes.ok) {
              throw new Error("Could not load Pokemon details.");
            }

            // Convert detail response to JSON.
            const pokemonData = await pokemonRes.json();
            // Return this Pokemon object into the Promise.all result array.
            return pokemonData;
          }),
        );

        // Save all Pokemon into component state.
        setPokemons(fullPokemonData);
      } catch {
        // If any fetch fails, show a user-friendly message.
        setErrorMessage("Could not load Pokemon data.");
      } finally {
        // Stop grid loading spinner whether success or failure.
        setIsGridLoading(false);
      }
    }

    // Start the initial fetch operation.
    fetchPokemons();
  }, []);

  // Keep Pokemon list sorted by ID for stable display order.
  const sortedPokemons = useMemo(
    () => [...pokemons].sort((a, b) => a.id - b.id),
    [pokemons],
  );

  const selectedPokemonIndex = useMemo(() => {
    if (!selectedPokemon) {
      return -1;
    }

    return sortedPokemons.findIndex(
      (pokemon) => pokemon.id === selectedPokemon.id,
    );
  }, [selectedPokemon, sortedPokemons]);

  const previousPokemon =
    selectedPokemonIndex > 0 ? sortedPokemons[selectedPokemonIndex - 1] : null;

  const nextPokemon =
    selectedPokemonIndex >= 0 &&
    selectedPokemonIndex < sortedPokemons.length - 1
      ? sortedPokemons[selectedPokemonIndex + 1]
      : null;

  useEffect(() => {
    async function buildTeamWeaknesses() {
      if (!teamPokemons.length) {
        setTeamWeaknesses([]);
        return;
      }

      try {
        const uniqueTypeEntries = [
          ...new Map(
            teamPokemons
              .flatMap((pokemon) => pokemon.types)
              .map((entry) => [entry.type.name, entry.type.url]),
          ).entries(),
        ];

        const typeWeaknessEntries = await Promise.all(
          uniqueTypeEntries.map(async ([typeName, typeUrl]) => {
            const response = await fetch(typeUrl);

            if (!response.ok) {
              throw new Error("Could not load team type data.");
            }

            const typeData = await response.json();
            return [
              typeName,
              typeData.damage_relations.double_damage_from.map((t) => t.name),
            ];
          }),
        );

        const weaknessByType = new Map(typeWeaknessEntries);
        const weaknessCounter = teamPokemons.reduce((counter, pokemon) => {
          const pokemonWeaknesses = new Set(
            pokemon.types.flatMap(
              (entry) => weaknessByType.get(entry.type.name) || [],
            ),
          );

          pokemonWeaknesses.forEach((name) => {
            counter.set(name, (counter.get(name) || 0) + 1);
          });

          return counter;
        }, new Map());

        const weaknessesList = [...weaknessCounter.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        setTeamWeaknesses(weaknessesList);
      } catch {
        setTeamWeaknesses([]);
      }
    }

    buildTeamWeaknesses();
  }, [teamPokemons]);

  // Converts names like "mr-mime" into "Mr Mime".
  const formatName = (name) =>
    name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  // Converts numeric ID into #0001 format.
  const formatNumber = (id) => `#${String(id).padStart(4, "0")}`;

  // Recursively walks evolution chain and returns all species names.
  const extractEvolutionNames = (node) => {
    // Start with the current species.
    const names = [node.species.name];
    // If this species has no further evolutions, return now.
    if (!node.evolves_to.length) {
      return names;
    }

    // Return current species + all names from next evolution nodes.
    return [
      ...names,
      ...node.evolves_to.flatMap((nextNode) => extractEvolutionNames(nextNode)),
    ];
  };

  // Opens detail layout and loads extra detail data for one Pokemon.
  const openPokemonDetail = async (pokemon) => {
    // Save the clicked Pokemon immediately.
    setSelectedPokemon(pokemon);
    // Reset old detail data while new detail data loads.
    setDetailData(null);
    // Enable detail loading state.
    setIsDetailLoading(true);
    // Clear any previous errors.
    setErrorMessage("");

    try {
      // Fetch species to get evolution chain URL.
      const speciesRes = await fetch(pokemon.species.url);
      // Fail fast if species fetch fails.
      if (!speciesRes.ok) {
        throw new Error("Could not load species data.");
      }

      // Parse species JSON.
      const speciesData = await speciesRes.json();
      // Fetch evolution chain using species-provided URL.
      const evolutionRes = await fetch(speciesData.evolution_chain.url);
      // Fail fast if evolution fetch fails.
      if (!evolutionRes.ok) {
        throw new Error("Could not load evolution chain.");
      }

      // Parse evolution chain JSON.
      const evolutionData = await evolutionRes.json();
      // Fetch each Pokemon type endpoint to compute weaknesses.
      const typeResponses = await Promise.all(
        pokemon.types.map((entry) => fetch(entry.type.url)),
      );

      // Parse all type responses.
      const typeData = await Promise.all(
        typeResponses.map((response) => response.json()),
      );

      // Collect unique type names that deal double damage to this Pokemon.
      const weaknessNames = [
        ...new Set(
          typeData.flatMap((entry) =>
            entry.damage_relations.double_damage_from.map((type) => type.name),
          ),
        ),
      ];

      // Build a unique list of Pokemon names in the evolution chain.
      const evolutionNames = [
        ...new Set(extractEvolutionNames(evolutionData.chain)),
      ];
      // Fetch each evolution Pokemon to display image + number.
      const evolutionPokemons = await Promise.all(
        evolutionNames.map(async (name) => {
          // Request one evolution Pokemon by name.
          const response = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${name}`,
          );
          // Parse the evolution Pokemon JSON.
          const evoPokemon = await response.json();
          // Return the small subset used by your evolution UI.
          return {
            id: evoPokemon.id,
            name: evoPokemon.name,
            image: evoPokemon.sprites.front_default,
            types: evoPokemon.types.map((t) => t.type.name),
          };
        }),
      );

      // Save all detail-only information for the selected Pokemon.
      setDetailData({
        weaknesses: weaknessNames,
        evolutionPokemons,
      });
    } catch {
      // Show a friendly message if any detail request fails.
      setErrorMessage("Could not load Pokemon detail view.");
    } finally {
      // End detail loading state.
      setIsDetailLoading(false);
    }
  };

  // Returns from detail layout back to grid layout.
  const closePokemonDetail = () => {
    // Clear selected Pokemon.
    setSelectedPokemon(null);
    // Clear detail data.
    setDetailData(null);
    // Clear error message.
    setErrorMessage("");
  };

  const openPreviousPokemon = () => {
    if (previousPokemon) {
      openPokemonDetail(previousPokemon);
    }
  };

  const openNextPokemon = () => {
    if (nextPokemon) {
      openPokemonDetail(nextPokemon);
    }
  };

  const addPokemonToTeam = (pokemon) => {
    setTeamPokemons((prevTeam) => {
      if (prevTeam.length >= teamLimit) {
        return prevTeam;
      }

      if (prevTeam.some((entry) => entry.id === pokemon.id)) {
        return prevTeam;
      }

      return [...prevTeam, pokemon];
    });
  };

  const removePokemonFromTeam = (pokemonId) => {
    setTeamPokemons((prevTeam) =>
      prevTeam.filter((pokemon) => pokemon.id !== pokemonId),
    );
  };

  if (isDetailLoading && selectedPokemon) {
    return (
      <DetailLoading
        selectedPokemon={selectedPokemon}
        onBack={closePokemonDetail}
        onPrevious={openPreviousPokemon}
        onNext={openNextPokemon}
        hasPrevious={Boolean(previousPokemon)}
        hasNext={Boolean(nextPokemon)}
        formatName={formatName}
      />
    );
  }

  if (selectedPokemon && detailData) {
    return (
      <PokemonDetail
        selectedPokemon={selectedPokemon}
        detailData={detailData}
        onBack={closePokemonDetail}
        onPrevious={openPreviousPokemon}
        onNext={openNextPokemon}
        hasPrevious={Boolean(previousPokemon)}
        hasNext={Boolean(nextPokemon)}
        formatName={formatName}
        formatNumber={formatNumber}
      />
    );
  }

  if (errorMessage && !selectedPokemon) {
    return <ErrorState message={errorMessage} />;
  }

  return (
    <PokemonGrid
      isGridLoading={isGridLoading}
      sortedPokemons={sortedPokemons}
      onSelectPokemon={openPokemonDetail}
      onAddToTeam={addPokemonToTeam}
      onRemoveFromTeam={removePokemonFromTeam}
      teamPokemons={teamPokemons}
      teamWeaknesses={teamWeaknesses}
      teamLimit={teamLimit}
      formatName={formatName}
      formatNumber={formatNumber}
    />
  );
}

// Export component so it can be rendered by main.jsx.
export default App;
