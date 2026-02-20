function PlaceholderPage({ title, description }) {
  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title text-xl">{title}</h2>
        <p className="text-base-content/70">{description}</p>
      </div>
    </section>
  );
}

export default PlaceholderPage;
