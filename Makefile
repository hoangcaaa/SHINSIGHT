.PHONY: dev-contract dev-web dev-supabase test-contract

dev-contract:
	cd contract && aptos move compile

dev-web:
	cd web && npm run dev

dev-supabase:
	supabase start

test-contract:
	cd contract && aptos move test

install:
	cd web && npm install

clean:
	cd web && rm -rf .next node_modules
