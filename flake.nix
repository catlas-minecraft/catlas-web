{
  description = "Node.js development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    vp-nix.url = "github:naitokosuke/vp-nix";
  };

  outputs =
    {
      self,
      nixpkgs,
      vp-nix,
    }:
    let
      system = "aarch64-darwin"; # Apple Silicon Mac
      pkgs = nixpkgs.legacyPackages.${system};

      nodejs = pkgs.nodejs_24;
      vp = vp-nix.packages.${system}.default;
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          vp
          pnpm_10

          git
          jq
        ];

        shellHook = ''
          export PATH="$PWD/node_modules/.bin:$PATH"

          echo "Node: $(node -v)"
          echo "pnpm:  $(pnpm -v)"
        '';
      };
    };
}
