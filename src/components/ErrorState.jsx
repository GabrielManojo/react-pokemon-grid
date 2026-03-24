function ErrorState({ message }) {
  return (
    <main className="app-shell py-5">
      <div className="container">
        <div className="alert alert-danger mb-0" role="alert">
          {message}
        </div>
      </div>
    </main>
  );
}

export default ErrorState;
