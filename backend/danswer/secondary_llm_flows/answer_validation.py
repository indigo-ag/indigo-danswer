from danswer.llm.factory import get_default_llm
from danswer.llm.utils import dict_based_prompt_to_langchain_prompt
from danswer.prompts.answer_validation import ANSWER_VALIDITY_PROMPT
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

logger = setup_logger()


@log_function_time()
def get_answer_validity(
    query: str,
    answer: str,
) -> bool:
    def _get_answer_validation_messages(
        query: str, answer: str
    ) -> list[dict[str, str]]:
        # Below COT block is unused, keeping for reference. Chain of Thought here significantly increases the time to
        # answer, we can get most of the way there but just having the model evaluate each individual condition with
        # a single True/False.
        # cot_block = (
        #    f"{THOUGHT_PAT} Use this as a scratchpad to write out in a step by step manner your reasoning "
        #    f"about EACH criterion to ensure that your conclusion is correct. "
        #    f"Be brief when evaluating each condition.\n"
        #    f"{FINAL_ANSWER_PAT} Valid or Invalid"
        # )

        messages = [
            {
                "role": "user",
                "content": ANSWER_VALIDITY_PROMPT.format(
                    user_query=query, llm_answer=answer
                ),
            },
        ]

        return messages

    def _extract_validity(model_output: str) -> bool:
        if model_output.strip().strip("```").strip().split()[-1].lower() == "invalid":
            return False
        return True  # If something is wrong, let's not toss away the answer

    messages = _get_answer_validation_messages(query, answer)
    filled_llm_prompt = dict_based_prompt_to_langchain_prompt(messages)
    model_output = get_default_llm().invoke(filled_llm_prompt)
    logger.debug(model_output)

    validity = _extract_validity(model_output)

    return validity
