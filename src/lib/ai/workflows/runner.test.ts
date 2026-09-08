import { describe, it, expect, beforeAll } from "vitest";
import { executeWorkflow } from "./runner";
import type { WorkflowDefinition, ToolExecutionContext } from "../types";
import { registerAllTools } from "../tools/index";

beforeAll(() => {
  registerAllTools();
});

const mockContext: ToolExecutionContext = {
  uid: "test-user",
  executionId: "exec_test_123",
  trigger: "ai_chat",
  mode: "ai_assist",
};

describe("Workflow Runner", () => {
  describe("executeWorkflow", () => {
    it("executes a single-step workflow", async () => {
      const workflow: WorkflowDefinition = {
        id: "single_step",
        name: "Single Step",
        description: "A single step workflow",
        steps: [
          {
            toolId: "calculate_profit",
            inputMapping: {
              productCost: "10",
              sellingPrice: "25",
              shippingCost: "5",
              platformFeePercent: "10",
              adSpendPerUnit: "2",
              units: "1",
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow, {}, mockContext);
      expect(result.success).toBe(true);
      expect(result.steps.length).toBe(1);
      expect(result.steps[0].result.success).toBe(true);
      expect(result.summary).toContain("1/1 steps completed");
    });

    it("executes a multi-step workflow", async () => {
      const workflow: WorkflowDefinition = {
        id: "multi_step",
        name: "Multi Step",
        description: "A multi step workflow",
        steps: [
          {
            toolId: "calculate_profit",
            inputMapping: {
              productCost: "10",
              sellingPrice: "25",
              shippingCost: "5",
              platformFeePercent: "10",
              adSpendPerUnit: "2",
              units: "1",
            },
          },
          {
            toolId: "calculate_margin",
            inputMapping: {
              costPrice: "10",
              desiredMarginPercent: "50",
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow, {}, mockContext);
      expect(result.success).toBe(true);
      expect(result.steps.length).toBe(2);
      expect(result.steps[0].result.success).toBe(true);
      expect(result.steps[1].result.success).toBe(true);
    });

    it("stops on failure", async () => {
      const workflow: WorkflowDefinition = {
        id: "fail_step",
        name: "Fail Step",
        description: "Workflow that fails",
        steps: [
          {
            toolId: "nonexistent_tool_xyz",
            inputMapping: {},
          },
          {
            toolId: "calculate_profit",
            inputMapping: {
              productCost: "10",
              sellingPrice: "25",
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow, {}, mockContext);
      expect(result.success).toBe(false);
      expect(result.steps.length).toBe(1);
      expect(result.steps[0].result.success).toBe(false);
    });

    it("skips steps with unmet conditions", async () => {
      const workflow: WorkflowDefinition = {
        id: "conditional",
        name: "Conditional",
        description: "Workflow with condition",
        steps: [
          {
            toolId: "calculate_profit",
            inputMapping: {
              productCost: "10",
              sellingPrice: "25",
            },
            condition: {
              field: "$input.skip",
              operator: "equals",
              value: "true",
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow, { skip: "false" }, mockContext);
      expect(result.success).toBe(true);
      expect(result.steps[0].result.summary).toContain("Skipped");
    });

    it("resolves input mapping from context", async () => {
      const workflow: WorkflowDefinition = {
        id: "mapped",
        name: "Mapped",
        description: "Workflow with mapped inputs",
        steps: [
          {
            toolId: "calculate_profit",
            inputMapping: {
              productCost: "$input.cost",
              sellingPrice: "$input.price",
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow, { cost: "15", price: "40" }, mockContext);
      expect(result.success).toBe(true);
      expect(result.steps[0].input.productCost).toBe(15);
      expect(result.steps[0].input.sellingPrice).toBe(40);
    });

    it("includes timing information", async () => {
      const workflow: WorkflowDefinition = {
        id: "timing",
        name: "Timing",
        description: "Check timing",
        steps: [
          {
            toolId: "calculate_profit",
            inputMapping: {
              productCost: "10",
              sellingPrice: "25",
            },
          },
        ],
      };

      const result = await executeWorkflow(workflow, {}, mockContext);
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
      expect(result.steps[0].duration).toBeGreaterThanOrEqual(0);
    });

    it("returns correct workflowId", async () => {
      const workflow: WorkflowDefinition = {
        id: "my_workflow",
        name: "My Workflow",
        description: "Test",
        steps: [
          {
            toolId: "calculate_profit",
            inputMapping: { productCost: "10", sellingPrice: "25" },
          },
        ],
      };

      const result = await executeWorkflow(workflow, {}, mockContext);
      expect(result.workflowId).toBe("my_workflow");
    });
  });
});
