import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; onError: () => void };

/**
 * Isola a cena 3D: se o chunk não baixar ou o WebGL falhar, o resto da página
 * (fundo, interface e painéis) continua funcionando.
 */
export class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Cena 3D indisponível:", error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
