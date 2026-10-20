# PACE: Portable Account Core for Ethereum

An industry coordination effort, stewarded by Ethlabs, on the part of the new Ethereum account every wallet builds the same way at Hegotá. It is a spec (the full EIP-8130 feature set, a shared threshold authenticator, ERC-7715 and ERC-7710 app permissions, EIP-7906 assertions from one shared builder, and ERC-7730 clear signing metadata) plus a few shared contracts. With it, a user can import their account into another wallet with its keys and app sessions, and read what they sign on any hardware wallet. Everything else is a wallet extension.

The repo holds the website and the interactive mockup. The ERC draft and the implementation spec live in the [ethereum-portable-account-standard](https://github.com/ethlabs-org/ethereum-portable-account-standard) repo.

- [`site/`](site): the website, with the landing page, the docs and the research notes.
- The repo root: the interactive mockup. A wallet, an app, a hardware wallet, an explorer and a second wallet share one account, with a guided tour. It uses sample data and touches no chain.

## Run the mockup

```bash
python3 serve.py
```

Then open http://localhost:8791. No Node needed. React and Babel load from a CDN.

With Node, `npm install` and `npm run dev` serve it through Vite.

## Run the site

```bash
cd site
npm install
npm run dev
```

[site/README.md](site/README.md) covers the build and the screenshots.

## Layout

```
site/         website (vocs)
src/          mockup source (React)
index.html    mockup entry, no build step
vite.html     mockup entry for Vite
demo.html     forwards old links to index.html
serve.py      static server with no-cache headers
```

## License

MIT, see [LICENSE](LICENSE).
