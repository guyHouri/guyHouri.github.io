# Private Modules

Some modules and data have a sensitive copyright or terms-of-service posture and live in a separate private repository.

The private repository is attached as one git submodule at:

```text
private/
```

The public repo stores only the submodule pointer. Anyone without access to the private repo sees the path but not its contents.

## Layout

```text
kruse-knowledge/
├── private/                 submodule -> kruse-knowledge-private
│   └── kemono_to_md/         private blog/archive scraper
├── scrapers/
│   ├── forum_to_md/
│   ├── twitter_to_md/
│   ├── linkedin_to_md/
│   ├── free_blogs_md/
│   ├── website_to_md/
├── summary/kruse-summary/
└── rag/
```

## Private Boundary

| Module | Why private |
|---|---|
| `private/kemono_to_md/` | The source posture is copyright/ToS sensitive, so scraper code and data stay outside the public repo. |
| future paid Q&A/audio modules | Raw audio, paid transcripts, and private exports should not be committed publicly. |

## Contributor Workflow

Without access:

```sh
git clone https://github.com/guyHouri/kruse-knowledge.git
cd kruse-knowledge
# public scrapers and summary code work without initializing private/
```

With access:

```sh
git clone --recurse-submodules https://github.com/guyHouri/kruse-knowledge.git
# or after a plain clone
git submodule update --init --recursive
```

## Updating The Submodule

Commit private changes inside the submodule first:

```sh
cd private
git add .
git commit -m "..."
git push
```

Then bump the pointer in the public repo:

```sh
cd ..
git add private
git commit -m "Bump private module pointer"
git push
```

The public repo records only the new private commit hash, not private file contents.
