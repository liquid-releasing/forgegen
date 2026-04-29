# Command-line use

forgegen itself is a desktop UI — it doesn't ship its own CLI. For batch
generation, scripting, and automation, use the **videoflow** CLI directly.
videoflow is forgegen's analysis + generation engine; every operation
available in the forgegen UI is available as a videoflow command.

→ **[videoflow CLI reference](https://github.com/liquid-releasing/videoflow/blob/main/docs/cli.md)**

For shell-recipe examples (batch processing, watch-folder pipelines), see
[Pipeline Integration](automation.md) on this site.

---

## Note on the analysis.json sidecar

The forgegen UI's **Save to folder** flow emits a `<stem>.analysis.json`
companion next to the funscript — see [Analysis output](../reference/analysis-output.md).
The videoflow CLI currently emits the `.funscript` only. Sidecar emission
from the CLI is planned once the writer module migrates from forgegen into
videoflow.

If you need the sidecar today, generate through the forgegen UI rather than
the CLI.
