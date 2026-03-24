function DetailLoading({ selectedPokemon, onBack, formatName }) {
  return (
    <main className="app-shell py-5">
      <div className="container detail-view">
        <button className="btn btn-outline-secondary mb-4" onClick={onBack}>
          Back to grid
        </button>
        <div
          className="alert alert-light border text-center mb-0"
          role="status"
        >
          Loading detail for {formatName(selectedPokemon.name)}...
        </div>
      </div>
    </main>
  );
}

export default DetailLoading;
