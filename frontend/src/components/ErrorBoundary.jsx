import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error, info) { console.error('Dakly interface error:', error, info); }

  render() {
    if (this.state.hasError) return (
      <main className="error-page">
        <p className="eyebrow">Workspace unavailable</p>
        <h1>The interface couldn’t load.</h1>
        <p>Reload to try again. If you were sending an email, check its delivery log before resending.</p>
        <button className="button button-primary" onClick={() => window.location.reload()}>Reload workspace</button>
      </main>
    );
    return this.props.children;
  }
}
